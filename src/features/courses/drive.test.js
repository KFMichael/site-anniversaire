import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cleProduit,
  estimerPanier,
  formaterPrix,
  lienProduitValide,
  lienRecherche,
  lireMagasinLeclerc,
  lirePrix,
} from './drive.js'

test('magasin Leclerc lu depuis n’importe quelle page du drive', () => {
  const base = 'https://fd9-courses.leclercdrive.fr/magasin-137701-Torcy/'
  assert.equal(lireMagasinLeclerc('https://fd9-courses.leclercdrive.fr/magasin-137701-Torcy/recherche.aspx?TexteRecherche=lait'), base)
  assert.equal(lireMagasinLeclerc(' https://fd9-courses.leclercdrive.fr/magasin-137701-Torcy/accueil.aspx '), base)
  assert.equal(lireMagasinLeclerc('https://fd9-courses.leclercdrive.fr/magasin-137701-Torcy'), base)
  assert.equal(lireMagasinLeclerc('https://fd9-courses.leclercdrive.fr/magasin-137701-Torcy.aspx'), base)
  assert.equal(lireMagasinLeclerc('https://www.leclercdrive.fr/'), null)
  assert.equal(lireMagasinLeclerc('http://fd9-courses.leclercdrive.fr/magasin-137701-Torcy/'), null)
  assert.equal(lireMagasinLeclerc('https://fd9-courses.leclercdrive.fr.pirate.com/magasin-1-X/'), null)
  assert.equal(lireMagasinLeclerc('pas un lien'), null)
})

test('lien de recherche par enseigne, terme encodé', () => {
  assert.equal(lienRecherche('carrefour', ' Crème fraîche '), 'https://www.carrefour.fr/s?q=Cr%C3%A8me%20fra%C3%AEche')
  assert.equal(
    lienRecherche('leclerc', 'lait & œufs', 'https://fd9-courses.leclercdrive.fr/magasin-137701-Torcy/'),
    'https://fd9-courses.leclercdrive.fr/magasin-137701-Torcy/recherche.aspx?TexteRecherche=lait%20%26%20%C5%93ufs'
  )
  assert.equal(lienRecherche('leclerc', 'lait', null), null)
})

test('fiche produit acceptée seulement sur le site de l’enseigne', () => {
  const carrefour = 'https://www.carrefour.fr/p/lait-demi-ecreme-3560070048991'
  assert.equal(lienProduitValide('carrefour', carrefour), carrefour)
  assert.equal(lienProduitValide('leclerc', carrefour), null)
  assert.equal(lienProduitValide('carrefour', 'javascript:alert(1)'), null)
  assert.equal(lienProduitValide('carrefour', 'https://carrefour.fr.exemple.com/p/x'), null)
  assert.ok(lienProduitValide('leclerc', 'https://fd9-courses.leclercdrive.fr/magasin-137701-Torcy/fiche-produits-123-Lait.aspx'))
})

test('prix saisis en euros', () => {
  assert.equal(lirePrix('2,49'), 249)
  assert.equal(lirePrix('2.5 €'), 250)
  assert.equal(lirePrix('12'), 1200)
  assert.equal(lirePrix('  '), null)
  assert.ok(Number.isNaN(lirePrix('deux euros')))
  assert.ok(Number.isNaN(lirePrix('-3')))
  assert.equal(formaterPrix(4520), '45,20 €')
})

test('estimation du panier : quantités simples multipliées, produits sans prix comptés', () => {
  const references = new Map([
    [cleProduit('Lait'), { prix_centimes: 100 }],
    [cleProduit('Farine'), { prix_centimes: 150 }],
  ])
  const elements = [
    { nom: 'lait', quantite: '3' },
    { nom: 'Farine', quantite: '1 kg' },
    { nom: 'Pain', quantite: null },
  ]
  assert.deepEqual(estimerPanier(elements, references), { total: 450, sansPrix: 1 })
  assert.equal(cleProduit('  Crème   Fraîche '), 'creme fraiche')
})
