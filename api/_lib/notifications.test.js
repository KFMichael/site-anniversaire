import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fauxSupabase } from '../../test/faux-supabase.js'
import { executerPushQuotidien, notificationHebdo, notificationMensuel } from './notifications.js'

const CONFIG = { fuseau: 'Europe/Paris' }
const DIMANCHE = new Date('2026-09-27T17:00:00Z')
const MARDI = new Date('2026-09-29T17:00:00Z')

function donnees() {
  return {
    espaces: [{ id: 'e1', nom: 'Foyer' }],
    profils: [
      { id: 'u1', prenom: 'Michael', email: 'm@x.fr' },
      { id: 'u2', prenom: 'Léa', email: 'l@x.fr' },
    ],
    membres_espace: [
      { espace_id: 'e1', user_id: 'u1' },
      { espace_id: 'e1', user_id: 'u2' },
    ],
    abonnements_push: [
      { id: 'ab1', user_id: 'u1', endpoint: 'https://push/1', p256dh: 'k', auth: 'a' },
      { id: 'ab2', user_id: 'u1', endpoint: 'https://push/2', p256dh: 'k', auth: 'a' },
      { id: 'ab3', user_id: 'u2', endpoint: 'https://push/3', p256dh: 'k', auth: 'a' },
    ],
    preferences_notifications: [],
    envois_recap: [],
    charges: [{ id: 'c1', espace_id: 'e1', nom: 'Finances', emoji: '💶', ordre: 1, archivee: false }],
    attributions: [{ espace_id: 'e1', charge_id: 'c1', user_id: 'u2', mois: '2026-09-01' }],
    produits: [{ id: 'p1', espace_id: 'e1', nom: 'Attiéké', etat: 'fini' }],
    articles_courses: [],
    plats: [{ id: 'garba', nom: 'Garba' }, { id: 'graine', nom: 'Sauce graine' }],
    diners: [
      { espace_id: 'e1', jour: '2026-09-27', plat_id: 'garba' },
      { espace_id: 'e1', jour: '2026-09-28', plat_id: 'graine' },
      { espace_id: 'e1', jour: '2026-09-29', texte: 'Resto' },
    ],
  }
}

function capteur() {
  const envois = []
  const envoyerPush = async (abonnement, notification) => envois.push({ id: abonnement.id, ...notification })
  return { envois, envoyerPush }
}

test('dimanche : dîner du soir et récap court sur chaque appareil', async () => {
  const tables = donnees()
  const { envois, envoyerPush } = capteur()
  const bilan = await executerPushQuotidien({ admin: fauxSupabase(tables), envoyerPush, maintenant: DIMANCHE, config: CONFIG })
  assert.equal(bilan.appareils, 6) // 3 appareils × 2 notifications
  assert.deepEqual(envois.filter((e) => e.tag === 'diner').map((e) => e.corps), ['Garba', 'Garba', 'Garba'])
  const lea = envois.find((e) => e.id === 'ab3' && e.tag === 'hebdo')
  assert.equal(lea.corps, '1 charge · 2 dîners prévus · 1 article à acheter') // lundi 28 et mardi 29
  assert.equal(envois.find((e) => e.id === 'ab1' && e.tag === 'hebdo').corps.startsWith('0 charge'), true)
})

test('jour ordinaire : seulement le dîner (texte libre compris)', async () => {
  const { envois, envoyerPush } = capteur()
  await executerPushQuotidien({ admin: fauxSupabase(donnees()), envoyerPush, maintenant: MARDI, config: CONFIG })
  assert.deepEqual([...new Set(envois.map((e) => `${e.tag}:${e.corps}`))], ['diner:Resto'])
})

test('préférences coupées et pas de doublon si la tâche est relancée', async () => {
  const tables = donnees()
  tables.preferences_notifications.push({ user_id: 'u1', push_diner: false, push_hebdo: true, push_mensuel: true })
  const admin = fauxSupabase(tables)
  const { envois, envoyerPush } = capteur()
  await executerPushQuotidien({ admin, envoyerPush, maintenant: DIMANCHE, config: CONFIG })
  await executerPushQuotidien({ admin, envoyerPush, maintenant: DIMANCHE, config: CONFIG })
  assert.equal(envois.filter((e) => e.tag === 'diner' && e.id !== 'ab3').length, 0)
  assert.equal(envois.length, 4) // Léa : dîner + hebdo ; Michael : hebdo × 2 appareils
})

test('abonnement expiré supprimé ; erreur temporaire retentée plus tard', async () => {
  const tables = donnees()
  const admin = fauxSupabase(tables)
  let panne = true
  const envoyerPush = async (abonnement) => {
    if (abonnement.id === 'ab2') throw Object.assign(new Error('Gone'), { statusCode: 410 })
    if (abonnement.id === 'ab3' && panne) throw Object.assign(new Error('Service indisponible'), { statusCode: 503 })
  }
  const bilan = await executerPushQuotidien({ admin, envoyerPush, maintenant: MARDI, config: CONFIG })
  assert.deepEqual(tables.abonnements_push.map((a) => a.id), ['ab1', 'ab3'])
  assert.equal(bilan.erreurs.length, 1)

  panne = false
  const suite = await executerPushQuotidien({ admin, envoyerPush, maintenant: MARDI, config: CONFIG })
  assert.equal(suite.notifications, 1) // seule Léa, dont l'envoi avait échoué
})

test('contenus', () => {
  assert.equal(notificationHebdo({ charges: 2, diners: 5, courses: 0 }).corps, '2 charges · 5 dîners prévus · 0 article à acheter')
  assert.equal(notificationHebdo({ charges: 1, diners: 1, seances: 1, courses: 2 }).corps, '1 charge · 1 dîner prévu · 1 séance de sport · 2 articles à acheter')
  assert.equal(notificationMensuel('2026-10-01', 3).titre, '🧠 Octobre 2026')
  assert.match(notificationMensuel('2026-10-01', 0).corps, /Toutes les charges/)
})

// Séances de la semaine du 28 septembre (heure de Paris = UTC + 2)
function avecSeances() {
  const tables = donnees()
  tables.seances_sport = [
    { espace_id: 'e1', debut: '2026-09-28T16:30:00Z', duree_minutes: 45, annulee: false }, // lundi 18h30
    { espace_id: 'e1', debut: '2026-09-28T05:00:00Z', duree_minutes: 45, annulee: false }, // lundi 7h00
    { espace_id: 'e1', debut: '2026-09-28T10:00:00Z', duree_minutes: 45, annulee: true }, // annulée
    { espace_id: 'e1', debut: '2026-09-30T16:30:00Z', duree_minutes: 45, annulee: false }, // mercredi
    { espace_id: 'e2', debut: '2026-09-28T06:00:00Z', duree_minutes: 45, annulee: false }, // autre espace
  ]
  return tables
}

test('sport : rappel la veille au soir, dans l’ordre, sans les annulées', async () => {
  const tables = avecSeances()
  const { envois, envoyerPush } = capteur()
  await executerPushQuotidien({ admin: fauxSupabase(tables), envoyerPush, maintenant: DIMANCHE, config: CONFIG })
  const sport = envois.filter((e) => e.tag === 'sport')
  assert.equal(sport.length, 3) // 3 appareils
  assert.equal(sport[0].titre, '🏃 Demain : sport')
  assert.equal(sport[0].corps, '2 séances : 07h00–07h45 et 18h30–19h15')
  assert.equal(sport[0].url, '/sport')
  // Le récap du dimanche compte les séances de la semaine
  assert.match(envois.find((e) => e.tag === 'hebdo').corps, /· 3 séances de sport ·/)
  assert.ok(tables.envois_recap.some((l) => l.type === 'push-sport' && l.periode === '2026-09-28'))

  // Mardi soir : une seule séance le mercredi ; préférence coupée respectée
  tables.preferences_notifications.push({ user_id: 'u1', push_sport: false })
  const suite = capteur()
  await executerPushQuotidien({ admin: fauxSupabase(tables), envoyerPush: suite.envoyerPush, maintenant: MARDI, config: CONFIG })
  assert.deepEqual(
    suite.envois.filter((e) => e.tag === 'sport').map((e) => [e.id, e.corps]),
    [['ab3', 'Séance 18h30–19h15']]
  )
})
