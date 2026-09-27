import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fauxSupabase } from '../../test/faux-supabase.js'
import { envoyerRappelEcheance } from './echeances.js'
import { executerPushQuotidien } from './notifications.js'

const CONFIG = { fuseau: 'Europe/Paris', lienApp: 'https://nido.4sept.com' }
const MAINTENANT = new Date('2026-09-29T17:00:00Z') // mardi 29 septembre

function donnees() {
  return {
    espaces: [{ id: 'e1', nom: 'Foyer' }],
    profils: [
      { id: 'u1', prenom: 'Michael', email: 'michael@exemple.fr' },
      { id: 'u2', prenom: 'Léa', email: 'lea@exemple.fr' },
      { id: 'u3', prenom: 'Zoé', email: 'zoe@exemple.fr' },
    ],
    membres_espace: [
      { espace_id: 'e1', user_id: 'u1' },
      { espace_id: 'e1', user_id: 'u2' },
    ],
    abonnements_push: [
      { id: 'ab1', user_id: 'u1', endpoint: 'https://push/1', p256dh: 'k', auth: 'a' },
      { id: 'ab2', user_id: 'u2', endpoint: 'https://push/2', p256dh: 'k', auth: 'a' },
    ],
    preferences_notifications: [],
    envois_recap: [],
    echeances: [
      { id: 'impots', espace_id: 'e1', titre: 'Déclaration des impôts', categorie: 'impots', date: '2026-10-06', rappels: [7, 1], responsable: null, note: 'Vérifier <la> date' },
      { id: 'assur', espace_id: 'e1', titre: 'Assurance auto', categorie: 'assurance', date: '2026-09-30', rappels: [1], responsable: 'u2' },
      { id: 'faite', espace_id: 'e1', titre: 'Loyer', categorie: 'logement', date: '2026-09-30', rappels: [1], faite_le: '2026-09-28T10:00:00Z' },
    ],
  }
}

function capteurs() {
  const emails = []
  const push = []
  return {
    emails,
    push,
    envoyer: async (e) => emails.push(e),
    envoyerPush: async (abonnement, notification) => push.push({ id: abonnement.id, ...notification }),
  }
}

test('rappels automatiques : J-7 à tous, la veille à la personne responsable, pas les faites, sans doublon', async () => {
  const tables = donnees()
  const c = capteurs()
  const admin = fauxSupabase(tables)
  await executerPushQuotidien({ admin, envoyerPush: c.envoyerPush, maintenant: MAINTENANT, config: CONFIG })
  await executerPushQuotidien({ admin, envoyerPush: c.envoyerPush, maintenant: MAINTENANT, config: CONFIG })
  assert.deepEqual(
    c.push.filter((p) => p.tag.startsWith('echeance')).map((p) => [p.id, p.titre, p.corps, p.url]),
    [
      ['ab1', '🧾 Déclaration des impôts', 'Dans 7 jours · mardi 6 octobre 2026', '/echeances'],
      ['ab2', '🛡️ Assurance auto', 'Demain · mercredi 30 septembre 2026', '/echeances'],
      ['ab2', '🧾 Déclaration des impôts', 'Dans 7 jours · mardi 6 octobre 2026', '/echeances'],
    ]
  )

  // Préférence coupée
  const t2 = donnees()
  t2.preferences_notifications.push({ user_id: 'u2', push_echeances: false })
  const c2 = capteurs()
  await executerPushQuotidien({ admin: fauxSupabase(t2), envoyerPush: c2.envoyerPush, maintenant: MAINTENANT, config: CONFIG })
  assert.deepEqual(c2.push.filter((p) => p.tag.startsWith('echeance')).map((p) => p.id), ['ab1'])
})

test('rappel immédiat : aux autres membres (email échappé + notification), limité dans le temps', async () => {
  const tables = donnees()
  const c = capteurs()
  const admin = fauxSupabase(tables)
  const resultat = await envoyerRappelEcheance({ admin, ...c, utilisateurId: 'u1', echeanceId: 'impots', config: CONFIG, maintenant: MAINTENANT })
  assert.deepEqual(resultat, { destinataires: ['Léa'] })
  assert.deepEqual(c.emails.map((e) => e.a), ['lea@exemple.fr'])
  assert.equal(c.emails[0].sujet, '🧾 Rappel : Déclaration des impôts (dans 7 jours)')
  assert.match(c.emails[0].html, /Vérifier &lt;la&gt; date/)
  assert.match(c.emails[0].html, /Michael te le rappelle/)
  assert.deepEqual(c.push.map((p) => [p.id, p.corps]), [['ab2', 'Michael te le rappelle · dans 7 jours']])

  const encore = await envoyerRappelEcheance({ admin, ...c, utilisateurId: 'u1', echeanceId: 'impots', config: CONFIG, maintenant: MAINTENANT })
  assert.match(encore.erreur, /vient d’être envoyé/)
})

test('rappel immédiat : à la personne responsable seulement ; refusé à un non-membre', async () => {
  const c = capteurs()
  const tables = donnees()
  tables.echeances[0].responsable = 'u2'
  const admin = fauxSupabase(tables)
  const resultat = await envoyerRappelEcheance({ admin, ...c, envoyerPush: null, utilisateurId: 'u1', echeanceId: 'impots', config: CONFIG, maintenant: MAINTENANT })
  assert.deepEqual(resultat, { destinataires: ['Léa'] })
  const refus = await envoyerRappelEcheance({ admin, ...c, utilisateurId: 'u3', echeanceId: 'assur', config: CONFIG, maintenant: MAINTENANT })
  assert.match(refus.erreur, /ne fais pas partie/)
  const inconnue = await envoyerRappelEcheance({ admin, ...c, utilisateurId: 'u1', echeanceId: 'nope', config: CONFIG, maintenant: MAINTENANT })
  assert.match(inconnue.erreur, /introuvable/)
})
