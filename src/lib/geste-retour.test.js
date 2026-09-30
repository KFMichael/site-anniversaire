import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gesteReussi, sensDuGeste } from './geste-retour.js'

test('sens du geste : attendre 8 px, puis horizontal ou vertical', () => {
  assert.equal(sensDuGeste(3, 5), null)
  assert.equal(sensDuGeste(20, 4), 'horizontal')
  assert.equal(sensDuGeste(6, 30), 'vertical')
  assert.equal(sensDuGeste(-20, 4), 'horizontal')
})

test('geste réussi : un tiers de l’écran, 100 px au plus', () => {
  assert.equal(gesteReussi(99, 390), false)
  assert.equal(gesteReussi(100, 390), true)
  assert.equal(gesteReussi(79, 240), false)
  assert.equal(gesteReussi(80, 240), true)
})
