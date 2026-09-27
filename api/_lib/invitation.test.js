import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fauxSupabase } from '../../test/faux-supabase.js'
import { envoyerInvitationElement } from './invitation.js'

const CONFIG = { fuseau: 'Europe/Paris', lienApp: 'https://nido.4sept.com', domaine: 'nido.4sept.com' }
const MAINTENANT = new Date('2026-09-29T10:00:00Z')

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
    abonnements_push: [{ id: 'ab2', user_id: 'u2', endpoint: 'https://push/2', p256dh: 'k', auth: 'a' }],
    listes: [{ id: 'l1', espace_id: 'e1', nom: 'Films à voir', emoji: '🎬' }],
    elements_liste: [
      { id: 'el1', liste_id: 'l1', espace_id: 'e1', texte: 'Dune <2>', note: null, invitation_debut: '2026-10-03T18:30:00Z', invitation_duree: 150, invitation_sequence: 0, invitation_envoyee_le: null },
    ],
  }
}

function capteurs() {
  const emails = []
  const push = []
  return { emails, push, envoyer: async (e) => emails.push(e), envoyerPush: async (a, n) => push.push({ id: a.id, ...n }) }
}

test('invitation : .ics à chaque membre, notification aux autres, puis mise à jour et annulation', async () => {
  const tables = donnees()
  const admin = fauxSupabase(tables)
  const c = capteurs()
  assert.deepEqual(await envoyerInvitationElement({ admin, ...c, utilisateurId: 'u1', elementId: 'el1', action: 'envoyer', config: CONFIG, maintenant: MAINTENANT }), { envoyee: true })
  assert.deepEqual(c.emails.map((e) => e.a), ['michael@exemple.fr', 'lea@exemple.fr'])
  const [email] = c.emails
  assert.equal(email.sujet, '🎬 Dune <2> · samedi 3 octobre, 20h30–23h00')
  assert.match(email.html, /Dune &lt;2&gt;/)
  assert.doesNotMatch(email.html, /Dune <2>/)
  const ics = email.pieces[0].contenu.replace(/\r\n /g, '')
  assert.match(ics, /METHOD:REQUEST/)
  assert.match(ics, /UID:el1@nido.4sept.com/)
  assert.match(ics, /SEQUENCE:0/)
  assert.match(ics, /DTEND:20261003T210000Z/)
  assert.deepEqual(c.push.map((p) => [p.id, p.titre, p.corps]), [['ab2', '🎬 Dune <2>', 'Michael propose : samedi 3 octobre, 20h30–23h00']])
  assert.ok(tables.elements_liste[0].invitation_envoyee_le)

  // Nouvelle heure : même événement, séquence suivante
  tables.elements_liste[0].invitation_debut = '2026-10-03T19:00:00Z'
  const c2 = capteurs()
  await envoyerInvitationElement({ admin, ...c2, utilisateurId: 'u2', elementId: 'el1', action: 'envoyer', config: CONFIG, maintenant: MAINTENANT })
  assert.match(c2.emails[0].pieces[0].contenu, /SEQUENCE:1/)
  assert.deepEqual(c2.push.map((p) => p.id), []) // Léa a envoyé : Michael n'a pas d'appareil

  // Annulation
  const c3 = capteurs()
  assert.deepEqual(await envoyerInvitationElement({ admin, ...c3, utilisateurId: 'u1', elementId: 'el1', action: 'annuler', config: CONFIG, maintenant: MAINTENANT }), { annulee: true })
  assert.match(c3.emails[0].pieces[0].contenu, /METHOD:CANCEL/)
  assert.match(c3.emails[0].pieces[0].contenu, /SEQUENCE:2/)
  assert.equal(tables.elements_liste[0].invitation_debut, null)
})

test('invitation refusée : non-membre, sans date, date passée, annulation jamais envoyée', async () => {
  const c = capteurs()
  const admin = fauxSupabase(donnees())
  const appel = (x) => envoyerInvitationElement({ admin, ...c, elementId: 'el1', config: CONFIG, maintenant: MAINTENANT, action: 'envoyer', utilisateurId: 'u1', ...x })
  assert.match((await appel({ utilisateurId: 'u9' })).erreur, /ne fais pas partie/)
  assert.match((await appel({ action: 'annuler' })).erreur, /pas encore été envoyée/)
  assert.match((await appel({ maintenant: new Date('2026-10-04T00:00:00Z') })).erreur, /déjà passée/)
  const sansDate = donnees()
  sansDate.elements_liste[0].invitation_debut = null
  assert.match((await envoyerInvitationElement({ admin: fauxSupabase(sansDate), ...c, utilisateurId: 'u1', elementId: 'el1', action: 'envoyer', config: CONFIG, maintenant: MAINTENANT })).erreur, /date et une heure/)
  assert.equal(c.emails.length, 0)
})
