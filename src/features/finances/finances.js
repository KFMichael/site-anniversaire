// Finances : dépenses du compte commun rangées par poste, pour voir où part
// l'argent. Logique pure, testée par finances.test.js.
import { normaliser } from '../courses/liste.js'
import { formaterPrix } from '../courses/drive.js'

// Même liste que la contrainte de la table `depenses` (migration 0016)
export const POSTES = [
  { id: 'courses', label: 'Courses', emoji: '🛒' },
  { id: 'restaurant', label: 'Restaurants', emoji: '🍽️' },
  { id: 'activites', label: 'Activités et sorties', emoji: '🎈' },
  { id: 'maison', label: 'Maison', emoji: '🏠' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'sante', label: 'Santé', emoji: '💊' },
  { id: 'abonnements', label: 'Abonnements', emoji: '📺' },
  { id: 'vacances', label: 'Vacances', emoji: '✈️' },
  { id: 'cadeaux', label: 'Cadeaux', emoji: '🎁' },
  { id: 'autre', label: 'Autre', emoji: '📦' },
]

const PAR_ID = new Map(POSTES.map((p) => [p.id, p]))

export function poste(id) {
  return PAR_ID.get(id) ?? PAR_ID.get('autre')
}

// « 12,50 », « 1 250 € », « 8.5 » → centimes ; vide → null ; illisible,
// nul ou négatif → NaN
export function lireMontant(texte) {
  const propre = (texte ?? '').replace(/[\s  €]/g, '').replace(',', '.')
  if (!propre) return null
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(propre)) return Number.NaN
  const centimes = Math.round(Number(propre) * 100)
  return centimes > 0 ? centimes : Number.NaN
}

// Jour 'AAAA-MM-JJ' → mois 'AAAA-MM-01' (même format que la charge mentale)
export function moisDuJour(jour) {
  return `${jour.slice(0, 7)}-01`
}

// Dépenses d'un mois, les plus récentes d'abord
export function depensesDuMois(depenses, mois) {
  return depenses
    .filter((d) => moisDuJour(d.jour) === mois)
    .sort((a, b) => b.jour.localeCompare(a.jour) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))
}

export function total(depenses) {
  return depenses.reduce((t, d) => t + d.montant_centimes, 0)
}

// Total par poste, du plus gros au plus petit ; part en % arrondie
export function repartitionParPoste(depenses) {
  const somme = total(depenses)
  const parPoste = new Map()
  for (const d of depenses) parPoste.set(d.categorie, (parPoste.get(d.categorie) ?? 0) + d.montant_centimes)
  return [...parPoste.entries()]
    .map(([id, montant]) => ({ poste: poste(id), montant, part: somme ? Math.round((montant / somme) * 100) : 0 }))
    .sort((a, b) => b.montant - a.montant || a.poste.label.localeCompare(b.poste.label, 'fr'))
}

// Évolution par rapport au mois précédent : null s'il n'y a rien à comparer
export function evolution(totalMois, totalPrecedent) {
  if (!totalPrecedent) return null
  return Math.round(((totalMois - totalPrecedent) / totalPrecedent) * 100)
}

// Poste deviné depuis le libellé (« Resto japonais » → restaurant), sinon null
const MOTS = [
  ['restaurant', ['resto', 'restaurant', 'brasserie', 'pizza', 'sushi', 'burger', 'kebab', 'cafe', 'bar', 'deliveroo', 'uber eats']],
  ['courses', ['courses', 'carrefour', 'leclerc', 'auchan', 'lidl', 'monoprix', 'franprix', 'intermarche', 'drive', 'marche']],
  ['activites', ['cinema', 'cine', 'concert', 'musee', 'theatre', 'bowling', 'expo', 'sortie', 'parc']],
  ['transport', ['essence', 'carburant', 'peage', 'parking', 'train', 'sncf', 'navigo', 'uber', 'taxi', 'metro']],
  ['sante', ['pharmacie', 'medecin', 'docteur', 'dentiste', 'mutuelle', 'kine']],
  ['abonnements', ['netflix', 'spotify', 'disney', 'canal', 'abonnement', 'box', 'forfait', 'deezer', 'prime']],
  ['vacances', ['hotel', 'airbnb', 'vol', 'avion', 'vacances', 'camping', 'location']],
  ['cadeaux', ['cadeau', 'anniversaire', 'noel']],
  ['maison', ['ikea', 'leroy merlin', 'castorama', 'meuble', 'loyer', 'electricite', 'edf', 'eau', 'travaux']],
]

export function devinerPoste(libelle) {
  const texte = ` ${normaliser(libelle).replace(/[^a-z0-9]+/g, ' ')} `
  for (const [id, mots] of MOTS) if (mots.some((m) => texte.includes(` ${m} `))) return id
  return null
}

// Seuil d'alerte : à partir de 80 % du budget, le poste est « presque atteint »
export const SEUIL_ALERTE = 80

// Lignes « par poste » du mois avec leur budget : les postes dépensés et
// ceux qui ont un budget (même sans dépense). budgets : [{ categorie,
// montant_centimes }]. niveau : null (pas de budget), 'ok', 'proche'
// (≥ 80 %) ou 'depasse' (> 100 %) ; ratio en % du budget.
export function lignesAvecBudget(depenses, budgets) {
  const parBudget = new Map(budgets.map((b) => [b.categorie, b.montant_centimes]))
  const lignes = repartitionParPoste(depenses)
  const presents = new Set(lignes.map((l) => l.poste.id))
  for (const b of budgets) {
    if (!presents.has(b.categorie)) lignes.push({ poste: poste(b.categorie), montant: 0, part: 0 })
  }
  return lignes.map((l) => {
    const budget = parBudget.get(l.poste.id) ?? null
    if (!budget) return { ...l, budget: null, ratio: null, niveau: null }
    const ratio = Math.round((l.montant / budget) * 100)
    return { ...l, budget, ratio, niveau: l.montant > budget ? 'depasse' : ratio >= SEUIL_ALERTE ? 'proche' : 'ok' }
  })
}

// Postes en alerte, les dépassements d'abord
export function alertesBudget(lignes) {
  return lignes
    .filter((l) => l.niveau === 'depasse' || l.niveau === 'proche')
    .sort((a, b) => (a.niveau === b.niveau ? b.ratio - a.ratio : a.niveau === 'depasse' ? -1 : 1))
}

// Une phrase par poste en alerte : « Restaurants : budget dépassé de 15,00 € »
export function texteAlerte(l) {
  return l.niveau === 'depasse'
    ? `${l.poste.label} : budget dépassé de ${formaterPrix(l.montant - l.budget)}`
    : `${l.poste.label} : ${l.ratio} % du budget atteint`
}
