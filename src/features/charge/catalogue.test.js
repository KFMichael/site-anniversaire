import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CATALOGUE, catalogueAvecEtat } from './catalogue.js'

test('catalogue : noms uniques, poids valides, emojis présents', () => {
  const noms = CATALOGUE.flatMap((t) => t.charges.map((c) => c.nom))
  assert.equal(new Set(noms).size, noms.length)
  for (const c of CATALOGUE.flatMap((t) => t.charges)) {
    assert.ok([1, 2, 3].includes(c.poids), c.nom)
    assert.ok(c.emoji && c.nom.length <= 80, c.nom)
  }
})

test('état de chaque charge selon celles de l’espace (casse et accents ignorés)', () => {
  const etats = catalogueAvecEtat([
    { id: 'c1', nom: 'faire la LESSIVE', archivee: false },
    { id: 'c2', nom: 'Gerer les finances', archivee: true },
    { id: 'c3', nom: 'Une charge maison', archivee: false },
  ])
  const trouver = (nom) => etats.flatMap((t) => t.charges).find((c) => c.nom === nom)
  assert.deepEqual([trouver('Faire la lessive').etat, trouver('Faire la lessive').id], ['active', 'c1'])
  assert.deepEqual([trouver('Gérer les finances').etat, trouver('Gérer les finances').id], ['archivee', 'c2'])
  assert.deepEqual([trouver('Repasser').etat, trouver('Repasser').id], ['libre', null])
})
