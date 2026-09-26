import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  chiffrerEntree,
  dechiffrerEntree,
  depuisBase64,
  genererMotDePasse,
  ouvrirCoffre,
  preparerCoffre,
  versBase64,
} from './crypto.js'

// Peu d'itérations pour que les tests restent rapides
const ITERATIONS = 100_000
const ESPACE = '2654616d-12bf-49e5-a82e-403a291d69cf'
const ENTREE = { nom: 'Netflix', identifiant: 'nous@mail.fr', motDePasse: 'pâtes🍝', note: '' }

test('base64 aller-retour', () => {
  const octets = new Uint8Array([0, 1, 127, 128, 255])
  assert.deepEqual(depuisBase64(versBase64(octets)), octets)
})

test('la bonne phrase ouvre le coffre et déchiffre les entrées', async () => {
  const { cle, parametres } = await preparerCoffre('ma phrase secrète', ESPACE, ITERATIONS)
  const ligne = await chiffrerEntree(cle, ESPACE, ENTREE)

  assert.ok(!ligne.chiffre.includes('Netflix'))

  const cleRetrouvee = await ouvrirCoffre('ma phrase secrète', ESPACE, parametres)
  assert.ok(cleRetrouvee)
  assert.deepEqual(await dechiffrerEntree(cleRetrouvee, ESPACE, ligne), ENTREE)
})

test('une mauvaise phrase est refusée', async () => {
  const { parametres } = await preparerCoffre('ma phrase secrète', ESPACE, ITERATIONS)
  assert.equal(await ouvrirCoffre('ma phrase secrete', ESPACE, parametres), null)
})

test('le coffre ne s’ouvre pas dans un autre espace', async () => {
  const { cle, parametres } = await preparerCoffre('ma phrase secrète', ESPACE, ITERATIONS)
  const autre = '00000000-0000-0000-0000-000000000001'
  assert.equal(await ouvrirCoffre('ma phrase secrète', autre, parametres), null)

  const ligne = await chiffrerEntree(cle, ESPACE, ENTREE)
  await assert.rejects(dechiffrerEntree(cle, autre, ligne))
})

test('un chiffré altéré est rejeté', async () => {
  const { cle } = await preparerCoffre('ma phrase secrète', ESPACE, ITERATIONS)
  const ligne = await chiffrerEntree(cle, ESPACE, ENTREE)
  const octets = depuisBase64(ligne.chiffre)
  octets[0] ^= 1
  await assert.rejects(dechiffrerEntree(cle, ESPACE, { ...ligne, chiffre: versBase64(octets) }))
})

test('deux chiffrements du même contenu diffèrent (IV aléatoire)', async () => {
  const { cle } = await preparerCoffre('ma phrase secrète', ESPACE, ITERATIONS)
  const a = await chiffrerEntree(cle, ESPACE, ENTREE)
  const b = await chiffrerEntree(cle, ESPACE, ENTREE)
  assert.notEqual(a.iv, b.iv)
  assert.notEqual(a.chiffre, b.chiffre)
})

test('générateur de mots de passe', () => {
  const mdp = genererMotDePasse(24)
  assert.equal(mdp.length, 24)
  assert.doesNotMatch(mdp, /[0O1lI]/)
  assert.notEqual(genererMotDePasse(), genererMotDePasse())
})
