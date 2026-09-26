import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fauxSupabase } from '../../test/faux-supabase.js'
import { executerRecapQuotidien } from './recap.js'
import { executerAction } from './actions.js'
import { cleActions, lireJeton } from './jetons.js'

const CLE = cleActions('secret-de-test')
const CONFIG = { nomApp: 'Nido', lienApp: 'https://nido.4sept.com', fuseau: 'Europe/Paris', cleActions: CLE }
const DIMANCHE = new Date('2026-09-27T17:00:00Z')

function donnees() {
  return {
    espaces: [{ id: 'e1', nom: 'Notre foyer' }],
    profils: [
      { id: 'u1', prenom: 'Michael', email: 'michael@exemple.fr' },
      { id: 'u2', prenom: 'Léa', email: 'lea@exemple.fr' },
    ],
    membres_espace: [
      { espace_id: 'e1', user_id: 'u1' },
      { espace_id: 'e1', user_id: 'u2' },
    ],
    preferences_notifications: [],
    envois_recap: [],
    charges: [{ id: 'c1', espace_id: 'e1', nom: 'Gérer les finances', emoji: '💶', ordre: 1, archivee: false }],
    attributions: [],
    produits: [{ id: 'p1', espace_id: 'e1', nom: 'Attiéké', etat: 'fini', quantite: '2' }],
    articles_courses: [{ id: 'a1', espace_id: 'e1', nom: 'Bougies', quantite: null }],
    plats: [
      { id: 'garba', espace_id: 'e1', nom: 'Garba', categorie: 'poisson', rapide: true },
      { id: 'alloco', espace_id: 'e1', nom: 'Alloco poulet braisé', categorie: 'viande', rapide: true },
      { id: 'omelette', espace_id: 'e1', nom: 'Pain omelette', categorie: 'oeufs', rapide: true },
    ],
    diners: [
      { espace_id: 'e1', jour: '2026-09-28', plat_id: 'garba', texte: null, verrouille: false },
      { espace_id: 'e1', jour: '2026-09-29', plat_id: 'alloco', texte: null, verrouille: true },
    ],
    reglages_menus: [{ espace_id: 'e1', pas_semaine_precedente: true, rapide_en_semaine: true, max_par_categorie: 2 }],
  }
}

// Envoie le récap et renvoie, par destinataire, les jetons des boutons
async function recapEtJetons(tables) {
  const envoyes = []
  await executerRecapQuotidien({
    admin: fauxSupabase(tables),
    envoyer: async (e) => envoyes.push(e),
    maintenant: DIMANCHE,
    config: CONFIG,
  })
  return Object.fromEntries(
    envoyes.map((e) => [
      e.a,
      [...e.html.matchAll(/api\/action\?t=([\w.-]+)/g)].map((m) => lireJeton(CLE, m[1])),
    ])
  )
}

const trouver = (jetons, a, c) => jetons.find((j) => j.a === a && j.c === c)

test('le récap contient des boutons signés au nom de chaque destinataire', async () => {
  const jetons = await recapEtJetons(donnees())
  const lea = jetons['lea@exemple.fr']
  assert.ok(lea.every((j) => j && j.u === 'u2' && j.e === 'e1'))
  assert.ok(trouver(lea, 'prendre', 'c1'))
  assert.ok(trouver(lea, 'achete', 'p1'))
  assert.ok(trouver(lea, 'achete', 'a1'))
  assert.equal(lea.filter((j) => j.a === 'autre').length, 7) // un par soir
  assert.ok(jetons['michael@exemple.fr'].every((j) => j.u === 'u1'))
})

test('« Je prends » : le premier l’obtient, le second est prévenu', async () => {
  const tables = donnees()
  const jetons = await recapEtJetons(tables)
  const admin = fauxSupabase(tables)

  const r1 = await executerAction(admin, trouver(jetons['lea@exemple.fr'], 'prendre', 'c1'))
  assert.equal(r1.ok, true)
  assert.match(r1.message, /Tu gères « Gérer les finances » en septembre 2026/)
  assert.deepEqual(tables.attributions.map((a) => [a.charge_id, a.user_id, a.mois]), [['c1', 'u2', '2026-09-01']])

  const r2 = await executerAction(admin, trouver(jetons['michael@exemple.fr'], 'prendre', 'c1'))
  assert.equal(r2.ok, false)
  assert.match(r2.message, /déjà été prise par Léa/)

  const r3 = await executerAction(admin, trouver(jetons['lea@exemple.fr'], 'prendre', 'c1'))
  assert.equal(r3.titre, 'Déjà à toi ✓')
})

test('« ✓ Acheté » : produit remis en stock, article retiré, deuxième clic sans effet', async () => {
  const tables = donnees()
  const jetons = (await recapEtJetons(tables))['lea@exemple.fr']
  const admin = fauxSupabase(tables)

  assert.match((await executerAction(admin, trouver(jetons, 'achete', 'p1'))).message, /Attiéké/)
  assert.deepEqual(tables.produits[0], { ...tables.produits[0], etat: 'ok', quantite: null, dans_panier: false })
  assert.equal((await executerAction(admin, trouver(jetons, 'achete', 'p1'))).titre, 'Déjà fait ✓')

  await executerAction(admin, trouver(jetons, 'achete', 'a1'))
  assert.equal(tables.articles_courses.length, 0)
})

test('« 🎲 Autre » : nouveau plat différent, soir verrouillé respecté', async () => {
  const tables = donnees()
  const jetons = (await recapEtJetons(tables))['lea@exemple.fr']
  const admin = fauxSupabase(tables)

  const r = await executerAction(admin, trouver(jetons, 'autre', '2026-09-28'))
  const lundi = tables.diners.find((d) => d.jour === '2026-09-28')
  assert.equal(r.ok, true)
  assert.notEqual(lundi.plat_id, 'garba')
  assert.notEqual(lundi.plat_id, 'alloco') // déjà prévu mardi
  assert.match(r.message, /au lieu de Garba/)

  const verrou = await executerAction(admin, trouver(jetons, 'autre', '2026-09-29'))
  assert.equal(verrou.ok, false)
  assert.equal(tables.diners.find((d) => d.jour === '2026-09-29').plat_id, 'alloco')

  // Soir vide : un plat est choisi
  await executerAction(admin, trouver(jetons, 'autre', '2026-10-01'))
  assert.ok(tables.diners.find((d) => d.jour === '2026-10-01')?.plat_id)
})

test('un ancien membre ne peut plus agir, même avec un jeton valide', async () => {
  const tables = donnees()
  const jetons = (await recapEtJetons(tables))['lea@exemple.fr']
  tables.membres_espace = tables.membres_espace.filter((m) => m.user_id !== 'u2')
  const r = await executerAction(fauxSupabase(tables), trouver(jetons, 'prendre', 'c1'))
  assert.equal(r.titre, 'Accès refusé')
  assert.equal(tables.attributions.length, 0)
})
