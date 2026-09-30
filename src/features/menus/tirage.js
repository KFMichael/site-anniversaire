// Semaines et tirage au sort des dîners (logique pure, testée par
// tirage.test.js).

function pad(n) {
  return String(n).padStart(2, '0')
}

export function versIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function depuisIso(iso) {
  const [a, m, j] = iso.split('-').map(Number)
  return new Date(a, m - 1, j)
}

// Lundi de la semaine d'une date (semaines du lundi au dimanche)
export function lundiDe(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return versIso(d)
}

export function decalerJours(iso, n) {
  const d = depuisIso(iso)
  d.setDate(d.getDate() + n)
  return versIso(d)
}

export function joursDeLaSemaine(lundi) {
  return Array.from({ length: 7 }, (_, i) => decalerJours(lundi, i))
}

// Du lundi au jeudi : soirs « de semaine » pour la règle des plats rapides
export function estSoirDeSemaine(iso) {
  const jour = depuisIso(iso).getDay()
  return jour >= 1 && jour <= 4
}

export function libelleJour(iso) {
  const texte = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric' }).format(
    depuisIso(iso)
  )
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

export function libelleSemaine(lundi) {
  const format = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
  return `Du ${format.format(depuisIso(lundi))} au ${format.format(depuisIso(decalerJours(lundi, 6)))}`
}

// Version courte pour l'écran : « 28 sept. – 4 oct. », « 1er – 7 sept. »
export function libelleSemaineCourte(lundi) {
  const debut = depuisIso(lundi)
  const fin = depuisIso(decalerJours(lundi, 6))
  const jour = (d) => (d.getDate() === 1 ? '1er' : String(d.getDate()))
  const mois = (d) => new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d)
  return debut.getMonth() === fin.getMonth()
    ? `${jour(debut)} – ${jour(fin)} ${mois(fin)}`
    : `${jour(debut)} ${mois(debut)} – ${jour(fin)} ${mois(fin)}`
}

// Règles, dans l'ordre où on les assouplit si aucun plat ne convient
const ASSOUPLISSEMENTS = [
  { id: 'pasSemainePrecedente', label: 'pas un plat de la semaine dernière' },
  { id: 'rapideEnSemaine', label: 'plats rapides en semaine' },
  { id: 'maxParCategorie', label: 'maximum par catégorie' },
  { id: 'pasDeRepetition', label: 'pas deux fois le même plat' },
]

function candidats(plats, jour, dejaChoisis, semainePrecedente, regles) {
  const parCategorie = new Map()
  for (const p of dejaChoisis) parCategorie.set(p.categorie, (parCategorie.get(p.categorie) ?? 0) + 1)
  const idsChoisis = new Set(dejaChoisis.map((p) => p.id))

  return plats.filter(
    (p) =>
      (!regles.pasDeRepetition || !idsChoisis.has(p.id)) &&
      (!regles.pasSemainePrecedente || !semainePrecedente.has(p.id)) &&
      (!regles.rapideEnSemaine || !estSoirDeSemaine(jour) || p.rapide) &&
      (!regles.maxParCategorie || (parCategorie.get(p.categorie) ?? 0) < regles.maxParCategorie)
  )
}

// Tire un plat pour chacun des `joursATirer`, en respectant les plats déjà
// fixés (`fixes` : plats des autres jours de la semaine) et les règles.
// Si aucun plat ne respecte toutes les règles pour un jour, on les assouplit
// une à une (la liste des règles assouplies est renvoyée pour l'affichage).
//
// reglages : { pasSemainePrecedente, rapideEnSemaine, maxParCategorie (0 = sans) }
// Renvoie { choix: { [jour]: plat }, assouplies: [libellés] }
export function tirerDiners({
  plats,
  joursATirer,
  fixes = [],
  semainePrecedente = [],
  reglages,
  aleatoire = Math.random,
}) {
  const precedente = new Set(semainePrecedente)
  const dejaChoisis = [...fixes]
  const choix = {}
  const assouplies = new Set()

  for (const jour of joursATirer) {
    const regles = { ...reglages, pasDeRepetition: true }
    let possibles = candidats(plats, jour, dejaChoisis, precedente, regles)
    for (const regle of ASSOUPLISSEMENTS) {
      if (possibles.length > 0) break
      if (!regles[regle.id]) continue
      regles[regle.id] = false
      assouplies.add(regle.label)
      possibles = candidats(plats, jour, dejaChoisis, precedente, regles)
    }
    if (possibles.length === 0) continue // bibliothèque vide

    const plat = possibles[Math.floor(aleatoire() * possibles.length)]
    choix[jour] = plat
    dejaChoisis.push(plat)
  }

  return { choix, assouplies: [...assouplies] }
}

// Ingrédients de plusieurs plats, sans doublon (comparaison sans accents ni
// casse), dans l'ordre d'apparition
export function ingredientsDe(plats, normaliser) {
  const vus = new Map()
  for (const plat of plats) {
    for (const ingredient of plat.ingredients ?? []) {
      const nom = ingredient.trim()
      const cle = normaliser(nom)
      if (cle && !vus.has(cle)) vus.set(cle, nom)
    }
  }
  return [...vus.values()]
}
