import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleActions, creerJeton, DUREE_VALIDITE_S, lireJeton } from './jetons.js'

const CLE = cleActions('secret-de-test')
const CONTENU = { u: 'u1', e: 'e1', a: 'prendre', c: 'c1', m: '2026-10-01' }

test('un jeton valide est relu à l’identique', () => {
  const lu = lireJeton(CLE, creerJeton(CLE, CONTENU))
  assert.deepEqual({ ...lu, x: undefined }, { ...CONTENU, x: undefined })
})

test('jeton modifié, mauvaise clé, expiré ou malformé : refusé', () => {
  const jeton = creerJeton(CLE, CONTENU)
  const [charge, signature] = jeton.split('.')
  const falsifie = Buffer.from(JSON.stringify({ ...CONTENU, u: 'intrus', x: 9e9 })).toString('base64url')
  assert.equal(lireJeton(CLE, `${falsifie}.${signature}`), null)
  assert.equal(lireJeton(cleActions('autre-secret'), jeton), null)
  assert.equal(lireJeton(CLE, jeton, Date.now() + (DUREE_VALIDITE_S + 60) * 1000), null)
  for (const mauvais of [undefined, '', 'abc', `${charge}.`, `.${signature}`, 'a.b.c']) {
    assert.equal(lireJeton(CLE, mauvais), null, String(mauvais))
  }
})
