import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compterListe, construireListe, grouperParRayon, normaliser } from './liste.js'

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
