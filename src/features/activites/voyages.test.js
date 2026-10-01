import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CENTRE_DEFAUT, centreCarte, libelleDateVoyage, lireResultats, trierVoyages, urlRecherche } from './voyages.js'

test('résultats de la recherche de lieux', () => {
  const json = [
    { name: 'Lisbonne', display_name: 'Lisbonne, Lisboa, Portugal', lat: '38.7077', lon: '-9.1365' },
    { name: '', display_name: 'Abidjan, Côte d’Ivoire', lat: '5.32', lon: '-4.02' },
    { name: 'Nulle part', display_name: 'Nulle part', lat: 'abc', lon: '2' },
    { name: 'Portugal', display_name: 'Portugal', lat: '39.6', lon: '-8' },
  ]
  assert.deepEqual(
    lireResultats(json).map((r) => [r.lieu, r.latitude, r.longitude]),
    [
      ['Lisbonne, Portugal', 38.7077, -9.1365],
      ['Abidjan, Côte d’Ivoire', 5.32, -4.02],
      ['Portugal', 39.6, -8],
    ]
  )
  assert.equal(lireResultats({ erreur: 1 }).length, 0)
  assert.equal(urlRecherche(' Lisbonne & co '), 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=fr&q=Lisbonne%20%26%20co')
})

test('tri et centre de la carte', () => {
  const voyages = [
    { id: 'a', date_voyage: null, created_at: '2026-01-02', latitude: 1, longitude: 1 },
    { id: 'b', date_voyage: '2024-05-01', created_at: '2026-01-01', latitude: 2, longitude: 2 },
    { id: 'c', date_voyage: '2025-08-01', created_at: '2026-01-03', latitude: 3, longitude: 3 },
    { id: 'd', date_voyage: null, created_at: '2026-01-04', latitude: 4, longitude: 4 },
  ]
  assert.deepEqual(trierVoyages(voyages).map((v) => v.id), ['c', 'b', 'd', 'a'])
  assert.deepEqual(centreCarte(voyages), [3, 3])
  assert.deepEqual(centreCarte([]), CENTRE_DEFAUT)
  assert.equal(libelleDateVoyage('2024-05-01'), 'mai 2024')
  assert.equal(libelleDateVoyage(null), '')
})
