// Logique pure de la charge mentale (sans React ni Supabase) : testable
// avec Node, voir calculs.test.js.

function pad(n) {
  return String(n).padStart(2, '0')
}

// Mois au format de la base : 'AAAA-MM-01', dans le fuseau de l'appareil
export function moisDe(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`
}

export function decalerMois(mois, n) {
  const [annee, m] = mois.split('-').map(Number)
  return moisDe(new Date(annee, m - 1 + n, 1))
}

export function libelleMois(mois) {
  const [annee, m] = mois.split('-').map(Number)
  const texte = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(annee, m - 1, 1)
  )
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

// Le mois en cours et le suivant se modifient ; les mois passés sont de
// l'historique en lecture seule
export function moisModifiable(mois, reference = new Date()) {
  const courant = moisDe(reference)
  return mois === courant || mois === decalerMois(courant, 1)
}

export const POIDS = [
  { valeur: 1, label: 'Léger' },
  { valeur: 2, label: 'Moyen' },
  { valeur: 3, label: 'Lourd' },
]

// Répartition des points d'un mois entre les membres.
// charges : [{ id, poids }], attributions : [{ charge_id, user_id }],
// membres : [{ user_id }] (dans l'ordre d'affichage)
export function calculerRepartition(charges, attributions, membres) {
  const ownerParCharge = new Map(attributions.map((a) => [a.charge_id, a.user_id]))
  const parMembre = new Map(membres.map((m) => [m.user_id, { user_id: m.user_id, points: 0, nombre: 0 }]))
  const libres = { points: 0, nombre: 0 }
  let total = 0

  for (const charge of charges) {
    total += charge.poids
    const cible = parMembre.get(ownerParCharge.get(charge.id)) ?? libres
    cible.points += charge.poids
    cible.nombre += 1
  }

  return { parMembre: [...parMembre.values()], libres, total }
}

// Charges d'un mois : celles actives, plus les archivées qui ont quand même
// un owner ce mois-là (pour que l'historique reste exact)
export function chargesDuMois(charges, attributions) {
  const attribuees = new Set(attributions.map((a) => a.charge_id))
  return charges
    .filter((c) => !c.archivee || attribuees.has(c.id))
    .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, 'fr'))
}

// Couleurs des membres (décoratives : le prénom est toujours affiché à côté)
const COULEURS = ['#0071EB', '#FF9500', '#34C759', '#AF52DE', '#FF2D55', '#00B8D4']

export function couleurMembre(index) {
  return COULEURS[index % COULEURS.length]
}
