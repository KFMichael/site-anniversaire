import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  chiffrerEntree,
  dechiffrerEntree,
  depuisBase64,
  depuisBase64Url,
  deriverClePrf,
  desenvelopperCle,
  envelopperAvecPhrase,
  envelopperCle,
  genererMotDePasse,
  octetsAleatoires,
  ouvrirCoffre,
  preparerCoffre,
  versBase64,
  versBase64Url,
} from './crypto.js'

// Peu d'itérations pour que les tests restent rapides
const ITERATIONS = 100_000
const ESPACE = '2654616d-12bf-49e5-a82e-403a291d69cf'
const AUTRE_ESPACE = '00000000-0000-0000-0000-000000000001'
const ENTREE = { nom: 'Netflix', identifiant: 'nous@mail.fr', motDePasse: 'pâtes🍝', note: '' }

test('base64 et base64url aller-retour', () => {
  const octets = new Uint8Array([0, 1, 62, 63, 127, 128, 251, 255])
  assert.deepEqual(depuisBase64(versBase64(octets)), octets)
  const url = versBase64Url(octets)
  assert.doesNotMatch(url, /[+/=]/)
  assert.deepEqual(depuisBase64Url(url), octets)
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

test('changer de phrase garde les entrées lisibles et invalide l’ancienne', async () => {
  const { cle, parametres } = await preparerCoffre('ancienne phrase', ESPACE, ITERATIONS)
  const ligne = await chiffrerEntree(cle, ESPACE, ENTREE)

  const nouveaux = await envelopperAvecPhrase(cle, 'nouvelle phrase', ESPACE, ITERATIONS)
  assert.notEqual(nouveaux.sel, parametres.sel)

  assert.equal(await ouvrirCoffre('ancienne phrase', ESPACE, nouveaux), null)
  const cleRetrouvee = await ouvrirCoffre('nouvelle phrase', ESPACE, nouveaux)
  assert.deepEqual(await dechiffrerEntree(cleRetrouvee, ESPACE, ligne), ENTREE)
})

test('enveloppe Face ID : le même secret PRF rouvre le coffre, un autre non', async () => {
  const { cle } = await preparerCoffre('ma phrase secrète', ESPACE, ITERATIONS)
  const ligne = await chiffrerEntree(cle, ESPACE, ENTREE)

  const secretPrf = octetsAleatoires(32)
  const enveloppe = await envelopperCle(await deriverClePrf(secretPrf), ESPACE, cle)

  const cleRetrouvee = await desenvelopperCle(await deriverClePrf(secretPrf), ESPACE, enveloppe)
  assert.deepEqual(await dechiffrerEntree(cleRetrouvee, ESPACE, ligne), ENTREE)

  const autreSecret = await deriverClePrf(octetsAleatoires(32))
  await assert.rejects(desenvelopperCle(autreSecret, ESPACE, enveloppe))
})

test('le coffre ne s’ouvre pas dans un autre espace', async () => {
  const { cle, parametres } = await preparerCoffre('ma phrase secrète', ESPACE, ITERATIONS)
  assert.equal(await ouvrirCoffre('ma phrase secrète', AUTRE_ESPACE, parametres), null)

  const ligne = await chiffrerEntree(cle, ESPACE, ENTREE)
  await assert.rejects(dechiffrerEntree(cle, AUTRE_ESPACE, ligne))
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
