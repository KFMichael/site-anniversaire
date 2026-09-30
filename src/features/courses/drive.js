// Commande au drive (Carrefour, Leclerc) : liens de recherche, produits
// mémorisés, prix et estimation du panier. Aucune enseigne n'ouvre d'API :
// on ouvre leur site sur le bon produit, le panier se remplit là-bas.
// Logique pure, testée par drive.test.js.
import { normaliser } from './liste.js'

export const ENSEIGNES = {
  carrefour: { id: 'carrefour', nom: 'Carrefour Drive', emoji: '🔵' },
  leclerc: { id: 'leclerc', nom: 'Leclerc Drive', emoji: '🟠' },
}

// Un produit est retrouvé par son nom, casse et accents ignorés : un article
// ponctuel « lait » profite du lien mémorisé pour le produit « Lait »
export function cleProduit(nom) {
  return normaliser(nom).replace(/\s+/g, ' ')
}

function lireUrl(texte) {
  try {
    const url = new URL((texte ?? '').trim())
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

const HOTE_LECLERC = /^fd\d+-courses\.leclercdrive\.fr$/i
const HOTE_CARREFOUR = /^(www\.)?carrefour\.fr$/i

// Le site Leclerc Drive est propre à chaque magasin : à partir de n'importe
// quelle page du magasin, on garde son adresse de base
// (https://fd9-courses.leclercdrive.fr/magasin-137701-Torcy/)
export function lireMagasinLeclerc(texte) {
  const url = lireUrl(texte)
  if (!url || !HOTE_LECLERC.test(url.hostname)) return null
  const magasin = url.pathname.match(/^\/(magasin-[\w-]+?)(?:\/|\.aspx|$)/i)
  return magasin ? `https://${url.hostname.toLowerCase()}/${magasin[1]}/` : null
}

// Lien de recherche du produit sur le site de l'enseigne (null si le magasin
// Leclerc n'est pas encore connu)
export function lienRecherche(enseigne, nom, magasinLeclerc) {
  const terme = encodeURIComponent(nom.trim())
  if (enseigne === 'carrefour') return `https://www.carrefour.fr/s?q=${terme}`
  if (enseigne === 'leclerc' && magasinLeclerc) return `${magasinLeclerc}recherche.aspx?TexteRecherche=${terme}`
  return null
}

// Lien d'une fiche produit collé par un membre : seulement une page https
// du site de l'enseigne choisie (sinon null)
export function lienProduitValide(enseigne, texte) {
  const url = lireUrl(texte)
  if (!url || url.href.length > 500) return null
  const hote = enseigne === 'carrefour' ? HOTE_CARREFOUR : enseigne === 'leclerc' ? HOTE_LECLERC : null
  return hote?.test(url.hostname) ? url.href : null
}

// « 2,49 », « 2.49 € », « 12 » → centimes ; vide → null ; illisible → NaN
export function lirePrix(texte) {
  const propre = (texte ?? '').replace(/\s|€/g, '').replace(',', '.')
  if (!propre) return null
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(propre)) return Number.NaN
  return Math.round(Number(propre) * 100)
}

const FORMAT_PRIX = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

export function formaterPrix(centimes) {
  return FORMAT_PRIX.format(centimes / 100).replace(/ | /g, ' ')
}

// Pour l'estimation : « 3 » compte trois fois le prix, « 500 g » une fois
function nombreUnites(quantite) {
  const n = /^\d{1,3}$/.test(quantite ?? '') ? Number(quantite) : 1
  return n > 0 ? n : 1
}

// Estimation du panier à partir des prix mémorisés
// references : Map cleProduit → { prix_centimes }
export function estimerPanier(elements, references) {
  let total = 0
  let sansPrix = 0
  for (const e of elements) {
    const prix = references.get(cleProduit(e.nom))?.prix_centimes
    if (prix == null) sansPrix += 1
    else total += prix * nombreUnites(e.quantite)
  }
  return { total, sansPrix }
}
