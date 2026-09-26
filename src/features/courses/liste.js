// Logique pure des courses (sans React ni Supabase), testée par liste.test.js
import { RAYONS } from './rayons.js'

function comparerNoms(a, b) {
  return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
}

// Regroupe des éléments par rayon, dans l'ordre des rayons ; les rayons
// vides sont omis. Renvoie [{ rayon, elements }]
export function grouperParRayon(elements) {
  const connus = new Set(RAYONS.map((r) => r.id))
  return RAYONS.map((r) => ({
    rayon: r,
    elements: elements
      .filter((e) => (connus.has(e.rayon) ? e.rayon : 'autre') === r.id)
      .sort(comparerNoms),
  })).filter((g) => g.elements.length > 0)
}

// La liste de courses : produits « fini » et « presque fini » du stock, plus
// les articles ponctuels. Chaque élément garde son origine pour savoir quoi
// faire quand on termine les courses.
export function construireListe(produits, articles) {
  return [
    ...produits
      .filter((p) => p.etat !== 'ok')
      .map((p) => ({ ...p, origine: 'stock' })),
    ...articles.map((a) => ({ ...a, etat: 'fini', origine: 'ponctuel' })),
  ]
}

export function compterListe(liste) {
  return {
    total: liste.length,
    dansPanier: liste.filter((e) => e.dans_panier).length,
    bientot: liste.filter((e) => e.origine === 'stock' && e.etat === 'bientot').length,
  }
}

// Recherche insensible aux accents et à la casse
export function normaliser(texte) {
  return (texte ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

// « 2 lait », « lait x2 », « 500 g farine », « Farine 1kg » → { nom, quantite }
// Sans quantité reconnue : { nom: texte, quantite: null }
const UNITES = '(?:kg|g|l|cl|ml|x|×|paquets?|boîtes?|bouteilles?|sachets?|pots?)'
const QUANTITE_AVANT = new RegExp(`^(\\d+(?:[.,]\\d+)?\\s*${UNITES}?)\\s+(.+)$`, 'i')
const QUANTITE_APRES_X = /^(.+?)\s+[x×]\s*(\d+(?:[.,]\d+)?)$/i
const QUANTITE_APRES = new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?\\s*${UNITES})$`, 'i')

export function lireArticle(texte) {
  const propre = texte.trim().replace(/\s+/g, ' ')
  let m = propre.match(QUANTITE_AVANT)
  if (m) return { nom: m[2], quantite: m[1].replace(/\s*[x×]$/i, '') }
  m = propre.match(QUANTITE_APRES_X)
  if (m) return { nom: m[1], quantite: m[2] }
  m = propre.match(QUANTITE_APRES)
  if (m) return { nom: m[1], quantite: m[2] }
  return { nom: propre, quantite: null }
}

// Un nombre seul se lit « × 2 » ; une quantité avec unité reste telle quelle
export function afficherQuantite(quantite) {
  return /^\d+(?:[.,]\d+)?$/.test(quantite) ? `× ${quantite}` : quantite
}
