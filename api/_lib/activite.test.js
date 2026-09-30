import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fauxSupabase } from '../../test/faux-supabase.js'
import { enumerer, envoyerActivite, resumerActivite } from './activite.js'

const MAINTENANT = new Date('2026-09-26T18:00:00Z')
const IL_Y_A = (minutes) => new Date(MAINTENANT.getTime() - minutes * 60000).toISOString()

function donnees() {
  return {
    profils: [
      { id: 'u1', prenom: 'Michael' },
      { id: 'u2', prenom: 'Léa' },
      { id: 'u3', prenom: 'Zoé' },
    ],
    membres_espace: [
      { espace_id: 'e1', user_id: 'u1' },
      { espace_id: 'e1', user_id: 'u2' },
    ],
    abonnements_push: [
      { id: 'ab1', user_id: 'u1', endpoint: 'https://push/1', p256dh: 'k', auth: 'a' },
      { id: 'ab2', user_id: 'u2', endpoint: 'https://push/2', p256dh: 'k', auth: 'a' },
      { id: 'ab3', user_id: 'u3', endpoint: 'https://push/3', p256dh: 'k', auth: 'a' },
    ],
    preferences_notifications: [],
    produits: [
      { id: 'p1', espace_id: 'e1', nom: 'Lait', etat: 'fini' },
      { id: 'p2', espace_id: 'e1', nom: 'Pain', etat: 'bientot' },
    ],
    articles_courses: [{ id: 'a1', espace_id: 'e1', nom: 'Bougies' }],
    evenements: [
      { id: 1, espace_id: 'e1', auteur: 'u2', type: 'ajout_liste', libelle: 'Lait', created_at: IL_Y_A(1), notifie_le: null },
      { id: 2, espace_id: 'e1', auteur: 'u2', type: 'ajout_liste', libelle: 'Pain', created_at: IL_Y_A(1), notifie_le: null },
      // Ajouté puis retiré avant l'envoi : pas annoncé
      { id: 3, espace_id: 'e1', auteur: 'u2', type: 'ajout_liste', libelle: 'Piles', created_at: IL_Y_A(1), notifie_le: null },
      { id: 4, espace_id: 'e1', auteur: 'u2', type: 'ajout_liste', libelle: 'bougies', created_at: IL_Y_A(1), notifie_le: null },
      { id: 5, espace_id: 'e1', auteur: 'u2', type: 'charge_prise', libelle: 'Finances', created_at: IL_Y_A(1), notifie_le: null },
      { id: 6, espace_id: 'e1', auteur: 'u1', type: 'diner', libelle: 'Garba', created_at: IL_Y_A(1), notifie_le: null },
      // Trop ancien : écarté ; déjà notifié : ignoré ; autre espace : ignoré
      { id: 7, espace_id: 'e1', auteur: 'u2', type: 'diner', libelle: 'Alloco', created_at: IL_Y_A(180), notifie_le: null },
      { id: 8, espace_id: 'e1', auteur: 'u2', type: 'diner', libelle: 'Foutou', created_at: IL_Y_A(1), notifie_le: IL_Y_A(0) },
      { id: 9, espace_id: 'e2', auteur: 'u3', type: 'diner', libelle: 'Attiéké', created_at: IL_Y_A(1), notifie_le: null },
      // Plus de 30 jours : supprimé du journal
      { id: 10, espace_id: 'e1', auteur: 'u2', type: 'diner', libelle: 'Placali', created_at: '2026-08-01T00:00:00Z', notifie_le: '2026-08-01T00:00:00Z' },
    ],
  }
}

function capteur() {
  const envois = []
  return { envois, envoyerPush: async (abonnement, notification) => envois.push({ id: abonnement.id, ...notification }) }
}

test('énumération courte des noms', () => {
  assert.equal(enumerer(['lait']), 'lait')
  assert.equal(enumerer(['lait', 'pain']), 'lait et pain')
  assert.equal(enumerer(['lait', 'pain', 'œufs']), 'lait, pain et œufs')
  assert.equal(enumerer(['lait', 'pain', 'œufs', 'riz']), 'lait, pain, œufs et 1 autre')
  assert.equal(enumerer(['a', 'b', 'c', 'd', 'e']), 'a, b, c et 2 autres')
})

test('résumé : une notification par auteur et par type, sans doublon', () => {
  const resumes = resumerActivite(
    [
      { auteur: 'u2', type: 'courses_faites', libelle: 'Lait' },
      { auteur: 'u2', type: 'courses_faites', libelle: 'lait' },
      { auteur: 'u2', type: 'courses_faites', libelle: 'Riz' },
      { auteur: 'u2', type: 'charge_prise', libelle: 'Finances' },
      { auteur: 'u2', type: 'charge_prise', libelle: 'Sport' },
      { auteur: 'u1', type: 'charge_prise', libelle: 'Linge' },
      { auteur: 'u9', type: 'inconnu', libelle: 'x' },
    ],
    new Map([['u1', 'Michael'], ['u2', 'Léa']])
  )
  assert.deepEqual(
    resumes.map((r) => [r.auteur, r.notification.titre, r.notification.corps, r.notification.url]),
    [
      ['u2', '✅ Courses faites', 'Léa a acheté Lait et Riz', '/courses'],
      ['u2', '🧠 Charge mentale', 'Léa prend 2 charges : Finances et Sport', '/charge'],
      ['u1', '🧠 Charge mentale', 'Michael prend « Linge »', '/charge'],
    ]
  )
})

test("chacun reçoit les actions des autres, jamais les siennes, puis plus rien", async () => {
  const tables = donnees()
  const { envois, envoyerPush } = capteur()
  const bilan = await envoyerActivite({ admin: fauxSupabase(tables), envoyerPush, utilisateurId: 'u1', espaceId: 'e1', maintenant: MAINTENANT })
  assert.deepEqual(bilan, { notifications: 3, appareils: 3 })
  assert.deepEqual(
    envois.map((e) => [e.id, e.corps]),
    [
      ['ab1', 'Léa a ajouté Lait, Pain et bougies'],
      ['ab1', 'Léa prend « Finances »'],
      ['ab2', 'Michael a prévu Garba'],
    ]
  )
  // Zoé (autre espace) ne reçoit rien ; les événements de l'espace sont marqués
  assert.ok(!envois.some((e) => e.id === 'ab3'))
  assert.ok(tables.evenements.filter((e) => e.espace_id === 'e1').every((e) => e.notifie_le))
  assert.equal(tables.evenements.find((e) => e.id === 9).notifie_le, null)
  assert.ok(!tables.evenements.some((e) => e.id === 10))

  const second = capteur()
  const rien = await envoyerActivite({ admin: fauxSupabase(tables), envoyerPush: second.envoyerPush, utilisateurId: 'u2', espaceId: 'e1', maintenant: MAINTENANT })
  assert.deepEqual(rien, { notifications: 0, appareils: 0 })
  assert.equal(second.envois.length, 0)
})

test('préférence coupée, appareil expiré, non-membre', async () => {
  const tables = donnees()
  tables.preferences_notifications.push({ user_id: 'u1', push_activite: false })
  const expire = async (abonnement) => {
    throw Object.assign(new Error('Gone'), { statusCode: 410, abonnement })
  }
  const bilan = await envoyerActivite({ admin: fauxSupabase(tables), envoyerPush: expire, utilisateurId: 'u2', espaceId: 'e1', maintenant: MAINTENANT })
  assert.deepEqual(bilan, { notifications: 0, appareils: 0 }) // Léa : appareil expiré, supprimé
  assert.deepEqual(tables.abonnements_push.map((a) => a.id), ['ab1', 'ab3'])

  const refus = await envoyerActivite({ admin: fauxSupabase(donnees()), envoyerPush: expire, utilisateurId: 'u3', espaceId: 'e1', maintenant: MAINTENANT })
  assert.ok(refus.erreur)
})

test('listes partagées : groupées par liste', () => {
  const prenoms = new Map([['u2', 'Léa']])
  const [une] = resumerActivite(
    [
      { auteur: 'u2', type: 'ajout_liste_partagee', libelle: 'Films à voir › Dune' },
      { auteur: 'u2', type: 'ajout_liste_partagee', libelle: 'Films à voir › Past Lives' },
    ],
    prenoms
  )
  assert.deepEqual(une.notification, { titre: '📝 Films à voir', corps: 'Léa a ajouté Dune et Past Lives', url: '/listes' })
  const [deux] = resumerActivite(
    [
      { auteur: 'u2', type: 'ajout_liste_partagee', libelle: 'Films à voir › Dune' },
      { auteur: 'u2', type: 'ajout_liste_partagee', libelle: 'Choses à faire › Réparer › le vélo' },
    ],
    prenoms
  )
  assert.equal(deux.notification.corps, 'Léa a ajouté Dune (Films à voir) et Réparer › le vélo (Choses à faire)')
})

test('commande au drive : la dernière commande est annoncée', () => {
  const [une] = resumerActivite(
    [{ auteur: 'u2', type: 'commande_drive', libelle: 'Carrefour Drive · 12 articles · 45,20 €' }],
    new Map([['u2', 'Léa']])
  )
  assert.deepEqual(une.notification, {
    titre: '🚗 Commande au drive',
    corps: 'Léa a passé la commande : Carrefour Drive · 12 articles · 45,20 €',
    url: '/courses',
  })
})
