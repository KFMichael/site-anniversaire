import { test } from 'node:test'
import assert from 'node:assert/strict'
import { afficherQuantite, compterListe, construireListe, grouperParRayon, lireArticle, normaliser } from './liste.js'

const produits = [
  { id: 'p1', nom: 'Lait', rayon: 'frais', etat: 'fini', dans_panier: false },
  { id: 'p2', nom: 'Beurre', rayon: 'frais', etat: 'bientot', dans_panier: true },
  { id: 'p3', nom: 'Pâtes', rayon: 'epicerie', etat: 'ok', dans_panier: false },
  { id: 'p4', nom: 'Pommes', rayon: 'fruits-legumes', etat: 'fini', dans_panier: false },
]
const articles = [{ id: 'a1', nom: 'Bougies', rayon: 'rayon-inconnu', dans_panier: false }]

test('la liste contient les produits fini / presque fini et les articles ponctuels', () => {
  const liste = construireListe(produits, articles)
  assert.deepEqual(liste.map((e) => e.id).sort(), ['a1', 'p1', 'p2', 'p4'])
  assert.equal(liste.find((e) => e.id === 'a1').origine, 'ponctuel')
  assert.equal(liste.find((e) => e.id === 'p2').etat, 'bientot')
})

test('groupement dans l’ordre des rayons, tri alphabétique, rayon inconnu → Autre', () => {
  const groupes = grouperParRayon(construireListe(produits, articles))
  assert.deepEqual(
    groupes.map((g) => [g.rayon.id, g.elements.map((e) => e.nom)]),
    [
      ['fruits-legumes', ['Pommes']],
      ['frais', ['Beurre', 'Lait']],
      ['autre', ['Bougies']],
    ]
  )
})

test('compteurs de la liste', () => {
  assert.deepEqual(compterListe(construireListe(produits, articles)), {
    total: 4,
    dansPanier: 1,
    bientot: 1,
  })
})

test('recherche sans accents ni majuscules', () => {
  assert.equal(normaliser('  Pâtes Fraîches '), 'pates fraiches')
})

test('quantité tapée avec l’article', () => {
  const cas = {
    'Lait': { nom: 'Lait', quantite: null },
    '2 lait': { nom: 'lait', quantite: '2' },
    '2x lait': { nom: 'lait', quantite: '2' },
    'lait x2': { nom: 'lait', quantite: '2' },
    'Lait × 3': { nom: 'Lait', quantite: '3' },
    '500 g farine': { nom: 'farine', quantite: '500 g' },
    'Farine 1kg': { nom: 'Farine', quantite: '1kg' },
    '1,5 l huile de palme': { nom: 'huile de palme', quantite: '1,5 l' },
    '3 paquets pâtes': { nom: 'pâtes', quantite: '3 paquets' },
    'Crème de palme': { nom: 'Crème de palme', quantite: null },
    '7up': { nom: '7up', quantite: null },
    '  2   bananes plantain ': { nom: 'bananes plantain', quantite: '2' },
  }
  for (const [texte, attendu] of Object.entries(cas)) assert.deepEqual(lireArticle(texte), attendu, texte)
})

test('affichage des quantités', () => {
  assert.equal(afficherQuantite('2'), '× 2')
  assert.equal(afficherQuantite('1,5'), '× 1,5')
  assert.equal(afficherQuantite('500 g'), '500 g')
  assert.equal(afficherQuantite('3 paquets'), '3 paquets')
})

test('rayon deviné depuis le nom saisi', async () => {
  const { devinerRayon } = await import('./rayons.js')
  assert.equal(devinerRayon('2 bananes'), 'fruits-legumes')
  assert.equal(devinerRayon('Œufs'), 'frais')
  assert.equal(devinerRayon('papier toilette'), 'hygiene')
  assert.equal(devinerRayon('Thon'), 'epicerie')
  assert.equal(devinerRayon('Pâtes'), 'epicerie')
  assert.equal(devinerRayon('Liquide vaisselle'), 'entretien')
  assert.equal(devinerRayon('Bougies'), 'autre')
  assert.equal(devinerRayon(''), 'autre')
})
