import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculerRepartition,
  chargesDuMois,
  decalerMois,
  libelleMois,
  moisDe,
  moisModifiable,
} from './calculs.js'

test('mois : format, décalage, passage d’année', () => {
  assert.equal(moisDe(new Date(2026, 8, 26)), '2026-09-01')
  assert.equal(decalerMois('2026-12-01', 1), '2027-01-01')
  assert.equal(decalerMois('2026-01-01', -1), '2025-12-01')
  assert.equal(libelleMois('2026-09-01'), 'Septembre 2026')
})

test('seuls le mois en cours et le suivant sont modifiables', () => {
  const ref = new Date(2026, 8, 26)
  assert.equal(moisModifiable('2026-09-01', ref), true)
  assert.equal(moisModifiable('2026-10-01', ref), true)
  assert.equal(moisModifiable('2026-08-01', ref), false)
  assert.equal(moisModifiable('2026-11-01', ref), false)
})

test('répartition des points entre membres et charges libres', () => {
  const charges = [
    { id: 'finances', poids: 3 },
    { id: 'lessive', poids: 2 },
    { id: 'courses', poids: 2 },
    { id: 'sport', poids: 1 },
  ]
  const attributions = [
    { charge_id: 'finances', user_id: 'm' },
    { charge_id: 'lessive', user_id: 'l' },
    { charge_id: 'sport', user_id: 'l' },
  ]
  const r = calculerRepartition(charges, attributions, [{ user_id: 'm' }, { user_id: 'l' }])
  assert.equal(r.total, 8)
  assert.deepEqual(r.parMembre, [
    { user_id: 'm', points: 3, nombre: 1 },
    { user_id: 'l', points: 3, nombre: 2 },
  ])
  assert.deepEqual(r.libres, { points: 2, nombre: 1 })
})

test('une charge d’un ancien membre compte comme libre', () => {
  const r = calculerRepartition(
    [{ id: 'a', poids: 2 }],
    [{ charge_id: 'a', user_id: 'parti' }],
    [{ user_id: 'm' }]
  )
  assert.deepEqual(r.libres, { points: 2, nombre: 1 })
})

test('les charges archivées restent dans l’historique si elles avaient un owner', () => {
  const charges = [
    { id: 'a', nom: 'A', ordre: 2, archivee: false },
    { id: 'b', nom: 'B', ordre: 1, archivee: true },
    { id: 'c', nom: 'C', ordre: 3, archivee: true },
  ]
  const ids = chargesDuMois(charges, [{ charge_id: 'b' }]).map((c) => c.id)
  assert.deepEqual(ids, ['b', 'a'])
})
