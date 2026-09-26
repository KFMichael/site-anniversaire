import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fauxSupabase } from '../../test/faux-supabase.js'
import { envoyerInvitationsSport, libelleSeance, seancesAEnvoyer } from './sport.js'

const CONFIG = { fuseau: 'Europe/Paris', lienApp: 'https://nido.4sept.com', domaine: 'nido.4sept.com' }
const MAINTENANT = new Date('2026-09-26T10:00:00Z')

function donnees() {
  return {
    profils: [
      { id: 'u1', prenom: 'Michael', email: 'michael@exemple.fr' },
      { id: 'u2', prenom: 'Léa', email: 'lea@exemple.fr' },
    ],
    membres_espace: [
      { espace_id: 'e1', user_id: 'u1' },
      { espace_id: 'e1', user_id: 'u2' },
    ],
    charges: [{ id: 'c-sport', espace_id: 'e1', nom: 'Prévoir les séances de sport', archivee: false }],
    attributions: [{ espace_id: 'e1', charge_id: 'c-sport', user_id: 'u1', mois: '2026-09-01' }],
    seances_sport: [
      { id: 's1', espace_id: 'e1', debut: '2026-09-28T16:30:00Z', duree_minutes: 45, sequence: 0, envoyee_le: null, annulee: false, updated_at: '2026-09-26T09:00:00Z' },
      { id: 's2', espace_id: 'e1', debut: '2026-09-30T05:00:00Z', duree_minutes: 45, sequence: 0, envoyee_le: null, annulee: false, updated_at: '2026-09-26T09:00:00Z' },
    ],
  }
}

function capteur() {
  const envois = []
  return { envois, envoyer: async (e) => envois.push(e) }
}

test('libellés dans le fuseau du foyer', () => {
  assert.equal(libelleSeance({ debut: '2026-09-28T16:30:00Z', duree_minutes: 45 }, 'Europe/Paris'), 'lundi 28 septembre, 18h30–19h15')
  assert.equal(libelleSeance({ debut: '2026-09-28T16:30:00Z', duree_minutes: 45 }, 'Africa/Abidjan'), 'lundi 28 septembre, 16h30–17h15')
})

test('le responsable envoie : une invitation par séance à chaque membre, puis plus rien à envoyer', async () => {
  const tables = donnees()
  const admin = fauxSupabase(tables)
  const { envois, envoyer } = capteur()
  const r = await envoyerInvitationsSport({ admin, envoyer, utilisateurId: 'u1', espaceId: 'e1', config: CONFIG, maintenant: MAINTENANT })
  assert.deepEqual(r, { envoyees: 2, annulees: 0 })
  assert.equal(envois.length, 4) // 2 séances × 2 membres
  const pourLea = envois.filter((e) => e.a === 'lea@exemple.fr')
  assert.equal(pourLea[0].sujet, '🏃 Sport lundi 28 septembre, 18h30–19h15')
  assert.equal(pourLea[0].pieces[0].type, 'text/calendar; charset=utf-8; method=REQUEST')
  assert.match(pourLea[0].pieces[0].contenu, /ORGANIZER;CN="Michael":mailto:michael@exemple.fr/)
  assert.match(pourLea[0].html, /Proposée par Michael/)
  assert.ok(tables.seances_sport.every((s) => s.envoyee_le && s.sequence === 0))

  const encore = await envoyerInvitationsSport({ admin, envoyer, utilisateurId: 'u1', espaceId: 'e1', config: CONFIG, maintenant: MAINTENANT })
  assert.match(encore.erreur, /Rien de nouveau/)
})

test('modification puis annulation : même UID, séquence croissante, séance supprimée après l’annulation', async () => {
  const tables = donnees()
  const admin = fauxSupabase(tables)
  const { envois, envoyer } = capteur()
  await envoyerInvitationsSport({ admin, envoyer, utilisateurId: 'u1', espaceId: 'e1', config: CONFIG, maintenant: MAINTENANT })

  const plusTard = new Date('2026-09-26T12:00:00Z')
  Object.assign(tables.seances_sport[0], { debut: '2026-09-28T17:00:00Z', updated_at: '2026-09-26T11:00:00Z' })
  Object.assign(tables.seances_sport[1], { annulee: true })
  envois.length = 0
  const r = await envoyerInvitationsSport({ admin, envoyer, utilisateurId: 'u1', espaceId: 'e1', config: CONFIG, maintenant: plusTard })
  assert.deepEqual(r, { envoyees: 1, annulees: 1 })
  const maj = envois.find((e) => e.pieces[0].contenu.includes('UID:s1@'))
  assert.match(maj.pieces[0].contenu, /SEQUENCE:1/)
  assert.match(maj.sujet, /19h00–19h45/)
  const annulation = envois.find((e) => e.pieces[0].contenu.includes('UID:s2@'))
  assert.match(annulation.pieces[0].contenu, /METHOD:CANCEL/)
  assert.match(annulation.sujet, /^Annulé/)
  assert.deepEqual(tables.seances_sport.map((s) => s.id), ['s1'])
})

test('seul le responsable du mois peut envoyer ; personne de responsable : tout le monde', async () => {
  const tables = donnees()
  const { envoyer } = capteur()
  const refus = await envoyerInvitationsSport({ admin: fauxSupabase(tables), envoyer, utilisateurId: 'u2', espaceId: 'e1', config: CONFIG, maintenant: MAINTENANT })
  assert.match(refus.erreur, /responsable/)

  tables.attributions = []
  const ok = await envoyerInvitationsSport({ admin: fauxSupabase(tables), envoyer, utilisateurId: 'u2', espaceId: 'e1', config: CONFIG, maintenant: MAINTENANT })
  assert.equal(ok.envoyees, 2)

  const intrus = await envoyerInvitationsSport({ admin: fauxSupabase(donnees()), envoyer, utilisateurId: 'x', espaceId: 'e1', config: CONFIG, maintenant: MAINTENANT })
  assert.match(intrus.erreur, /pas partie/)
})

test('à envoyer : nouvelles, modifiées, annulées déjà envoyées ; pas les séances passées', () => {
  const s = (o) => ({ debut: '2026-09-28T16:30:00Z', updated_at: '2026-09-26T09:00:00Z', envoyee_le: null, annulee: false, ...o })
  const liste = [
    s({ id: 'nouvelle' }),
    s({ id: 'envoyee', envoyee_le: '2026-09-26T09:00:00Z' }),
    s({ id: 'modifiee', envoyee_le: '2026-09-26T08:00:00Z' }),
    s({ id: 'annulee-envoyee', envoyee_le: '2026-09-26T09:00:00Z', annulee: true }),
    s({ id: 'annulee-jamais-envoyee', annulee: true }),
    s({ id: 'passee', debut: '2026-09-20T16:30:00Z' }),
  ]
  assert.deepEqual(seancesAEnvoyer(liste, MAINTENANT).map((x) => x.id), ['nouvelle', 'modifiee', 'annulee-envoyee'])
})
