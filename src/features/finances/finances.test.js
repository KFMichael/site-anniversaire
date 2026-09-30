import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  POSTES,
  depensesDuMois,
  devinerPoste,
  evolution,
  lireMontant,
  poste,
  repartitionParPoste,
  total,
} from './finances.js'

test('montants saisis en euros', () => {
  assert.equal(lireMontant('12,50'), 1250)
  assert.equal(lireMontant('1 250 €'), 125000)
  assert.equal(lireMontant('8.5'), 850)
  assert.equal(lireMontant(''), null)
  assert.ok(Number.isNaN(lireMontant('0')))
  assert.ok(Number.isNaN(lireMontant('-4')))
  assert.ok(Number.isNaN(lireMontant('douze')))
  assert.ok(Number.isNaN(lireMontant('1234567')))
})

const depenses = [
  { id: 'a', categorie: 'courses', montant_centimes: 6000, jour: '2026-09-03', created_at: '2026-09-03T10:00:00Z' },
  { id: 'b', categorie: 'restaurant', montant_centimes: 3000, jour: '2026-09-20', created_at: '2026-09-20T20:00:00Z' },
  { id: 'c', categorie: 'courses', montant_centimes: 1000, jour: '2026-09-20', created_at: '2026-09-20T21:00:00Z' },
  { id: 'd', categorie: 'inconnu', montant_centimes: 500, jour: '2026-08-31', created_at: '2026-08-31T10:00:00Z' },
]

test('dépenses du mois, les plus récentes d’abord', () => {
  assert.deepEqual(depensesDuMois(depenses, '2026-09-01').map((d) => d.id), ['c', 'b', 'a'])
  assert.deepEqual(depensesDuMois(depenses, '2026-08-01').map((d) => d.id), ['d'])
})

test('répartition par poste, du plus gros au plus petit', () => {
  const sept = depensesDuMois(depenses, '2026-09-01')
  assert.equal(total(sept), 10000)
  assert.deepEqual(
    repartitionParPoste(sept).map((r) => [r.poste.id, r.montant, r.part]),
    [['courses', 7000, 70], ['restaurant', 3000, 30]]
  )
  assert.equal(poste('inconnu').id, 'autre')
  assert.deepEqual(repartitionParPoste([]), [])
})

test('évolution par rapport au mois précédent', () => {
  assert.equal(evolution(12000, 10000), 20)
  assert.equal(evolution(5000, 10000), -50)
  assert.equal(evolution(5000, 0), null)
})

test('poste deviné depuis le libellé', () => {
  assert.equal(devinerPoste('Resto japonais'), 'restaurant')
  assert.equal(devinerPoste('Carrefour Drive'), 'courses')
  assert.equal(devinerPoste('Cinéma Pathé'), 'activites')
  assert.equal(devinerPoste('Pharmacie'), 'sante')
  assert.equal(devinerPoste('Barbecue'), null)
})

test('les postes correspondent à la contrainte de la migration', () => {
  const sql = readFileSync(new URL('../../../supabase/migrations/0016_finances.sql', import.meta.url), 'utf8')
  const liste = sql.match(/categorie in \(([^)]+)\)/)[1].match(/'([a-z]+)'/g).map((x) => x.slice(1, -1))
  assert.deepEqual(liste, POSTES.map((p) => p.id))
})
