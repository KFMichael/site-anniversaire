import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  decalerJours,
  estSoirDeSemaine,
  ingredientsDe,
  joursDeLaSemaine,
  libelleJour,
  lundiDe,
  tirerDiners,
} from './tirage.js'
import { normaliser } from '../courses/liste.js'

// Générateur pseudo-aléatoire déterministe pour des tests reproductibles
function graine(n) {
  let x = n
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648
    return x / 2147483648
  }
}

const REGLES = { pasSemainePrecedente: true, rapideEnSemaine: true, maxParCategorie: 2 }
const plats = [
  { id: 'bolo', categorie: 'pates', rapide: true },
  { id: 'carbo', categorie: 'pates', rapide: true },
  { id: 'lasagnes', categorie: 'pates', rapide: false },
  { id: 'saumon', categorie: 'poisson', rapide: true },
  { id: 'poulet', categorie: 'viande', rapide: false },
  { id: 'omelette', categorie: 'oeufs', rapide: true },
  { id: 'soupe', categorie: 'soupe', rapide: false },
  { id: 'croque', categorie: 'autre', rapide: true },
  { id: 'salade', categorie: 'vegetarien', rapide: true },
]

test('semaines du lundi au dimanche', () => {
  assert.equal(lundiDe(new Date(2026, 8, 26)), '2026-09-21') // samedi
  assert.equal(lundiDe(new Date(2026, 8, 27)), '2026-09-21') // dimanche
  assert.equal(lundiDe(new Date(2026, 8, 28)), '2026-09-28') // lundi
  assert.equal(decalerJours('2026-09-28', 7), '2026-10-05')
  assert.deepEqual(joursDeLaSemaine('2026-12-28').slice(-2), ['2027-01-02', '2027-01-03'])
  assert.equal(estSoirDeSemaine('2026-09-28'), true) // lundi
  assert.equal(estSoirDeSemaine('2026-10-02'), false) // vendredi
  assert.equal(libelleJour('2026-09-28'), 'Lundi 28')
})

test('une semaine complète respecte toutes les règles', () => {
  const jours = joursDeLaSemaine('2026-09-28')
  for (let n = 1; n <= 50; n++) {
    const { choix, assouplies } = tirerDiners({
      plats,
      joursATirer: jours,
      semainePrecedente: ['croque'],
      reglages: REGLES,
      aleatoire: graine(n),
    })
    const choisis = jours.map((j) => choix[j])
    assert.equal(assouplies.length, 0)
    assert.equal(new Set(choisis.map((p) => p.id)).size, 7, 'pas de répétition')
    assert.ok(!choisis.some((p) => p.id === 'croque'), 'pas la semaine précédente')
    assert.ok(choisis.slice(0, 4).every((p) => p.rapide), 'rapides du lundi au jeudi')
    assert.ok(choisis.filter((p) => p.categorie === 'pates').length <= 2, 'max 2 pâtes')
  }
})

test('les jours fixés comptent dans les règles', () => {
  const { choix } = tirerDiners({
    plats,
    joursATirer: ['2026-10-03'],
    fixes: [plats[0], plats[1]], // deux plats de pâtes déjà dans la semaine
    reglages: REGLES,
    aleatoire: graine(3),
  })
  assert.notEqual(choix['2026-10-03'].categorie, 'pates')
})

test('assouplit les règles plutôt que de laisser un soir vide', () => {
  const peu = [
    { id: 'a', categorie: 'pates', rapide: false },
    { id: 'b', categorie: 'pates', rapide: false },
  ]
  const { choix, assouplies } = tirerDiners({
    plats: peu,
    joursATirer: joursDeLaSemaine('2026-09-28'),
    semainePrecedente: ['a'],
    reglages: REGLES,
    aleatoire: graine(1),
  })
  assert.equal(Object.keys(choix).length, 7)
  assert.ok(assouplies.includes('pas deux fois le même plat'))
})

test('bibliothèque vide : aucun choix, pas d’erreur', () => {
  const { choix } = tirerDiners({ plats: [], joursATirer: ['2026-09-28'], reglages: REGLES })
  assert.deepEqual(choix, {})
})

test('ingrédients sans doublon', () => {
  const liste = ingredientsDe(
    [{ ingredients: ['Pâtes', 'Œufs', 'Fromage'] }, { ingredients: ['pates', ' Salade ', ''] }],
    normaliser
  )
  assert.deepEqual(liste, ['Pâtes', 'Œufs', 'Fromage', 'Salade'])
})

test('libellé court de la semaine', async () => {
  const { libelleSemaineCourte } = await import('./tirage.js')
  assert.equal(libelleSemaineCourte('2026-09-28'), '28 sept. – 4 oct.')
  assert.equal(libelleSemaineCourte('2026-06-01'), '1er – 7 juin')
  assert.equal(libelleSemaineCourte('2026-12-28'), '28 déc. – 3 janv.')
})
