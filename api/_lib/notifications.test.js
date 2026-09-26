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
  assert.equal(notificationMensuel('2026-10-01', 3).titre, '🧠 Octobre 2026')
  assert.match(notificationMensuel('2026-10-01', 0).corps, /Toutes les charges/)
})
