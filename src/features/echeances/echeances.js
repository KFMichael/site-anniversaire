// Échéances du foyer : catégories, suggestions, calculs de dates et rappels.
// Logique pure (dates 'AAAA-MM-JJ'), utilisée par l'écran et par la tâche
// quotidienne (api/_lib/echeances.js). Testée par echeances.test.js.

export const CATEGORIES_ECHEANCES = [
  { valeur: 'impots', label: 'Impôts', emoji: '🧾' },
  { valeur: 'assurance', label: 'Assurance', emoji: '🛡️' },
  { valeur: 'logement', label: 'Logement', emoji: '🏠' },
  { valeur: 'vehicule', label: 'Véhicule', emoji: '🚗' },
  { valeur: 'sante', label: 'Santé', emoji: '🩺' },
  { valeur: 'abonnement', label: 'Abonnement', emoji: '📺' },
  { valeur: 'anniversaire', label: 'Anniversaire', emoji: '🎂' },
  { valeur: 'autre', label: 'Autre', emoji: '📌' },
]

export function categorieEcheance(valeur) {
  return CATEGORIES_ECHEANCES.find((c) => c.valeur === valeur) ?? CATEGORIES_ECHEANCES.at(-1)
}

export const RECURRENCES = [
  { valeur: 'aucune', label: 'Une seule fois' },
  { valeur: 'mensuelle', label: 'Tous les mois' },
  { valeur: 'annuelle', label: 'Tous les ans' },
]

// Rappels proposés (jours avant l'échéance)
export const RAPPELS = [
  { jours: 30, label: '1 mois avant' },
  { jours: 7, label: '1 semaine avant' },
  { jours: 1, label: 'La veille' },
  { jours: 0, label: 'Le jour même' },
]

// Échéances courantes, pré-remplies d'un tap (la date se choisit ensuite,
// sauf quand elle est fixe chaque année : jourAnnuel 'MM-JJ')
export const SUGGESTIONS = [
  {
    titre: 'Déclaration des impôts',
    categorie: 'impots',
    recurrence: 'annuelle',
    jourAnnuel: '05-21',
    rappels: [30, 7, 1],
    note: 'La date limite dépend de ton département : vérifie-la sur impots.gouv.fr.',
  },
  { titre: 'Taxe foncière', categorie: 'impots', recurrence: 'annuelle', jourAnnuel: '10-15', rappels: [30, 7] },
  { titre: "Taxe d'habitation (résidence secondaire)", categorie: 'impots', recurrence: 'annuelle', jourAnnuel: '12-15', rappels: [30, 7] },
  { titre: 'Assurance habitation', categorie: 'assurance', recurrence: 'annuelle', rappels: [30, 7] },
  { titre: 'Assurance auto', categorie: 'assurance', recurrence: 'annuelle', rappels: [30, 7] },
  { titre: 'Mutuelle', categorie: 'sante', recurrence: 'annuelle', rappels: [30] },
  { titre: 'Contrôle technique', categorie: 'vehicule', recurrence: 'aucune', rappels: [30, 7] },
  { titre: 'Loyer', categorie: 'logement', recurrence: 'mensuelle', rappels: [1] },
]

const JOUR_MS = 24 * 3600 * 1000

function versDate(iso) {
  const [a, m, j] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, j))
}

function versIso(date) {
  return date.toISOString().slice(0, 10)
}

// Nombre de jours de `aujourdhui` à `date` (négatif si passée)
export function joursRestants(date, aujourdhui) {
  return Math.round((versDate(date) - versDate(aujourdhui)) / JOUR_MS)
}

// Même jour le mois ou l'année suivante, ramené au dernier jour du mois si
// besoin (31 janvier → 28 ou 29 février, 29 février → 28 février)
export function dateSuivante(date, recurrence) {
  const [a, m, j] = date.split('-').map(Number)
  const [annee, mois] = recurrence === 'mensuelle' ? [m === 12 ? a + 1 : a, m === 12 ? 1 : m + 1] : [a + 1, m]
  const dernierJour = new Date(Date.UTC(annee, mois, 0)).getUTCDate()
  return versIso(new Date(Date.UTC(annee, mois - 1, Math.min(j, dernierJour))))
}

// Prochaine occurrence d'un jour fixe de l'année ('MM-JJ'), aujourd'hui compris
export function prochainJourAnnuel(jourAnnuel, aujourdhui) {
  const annee = Number(aujourdhui.slice(0, 4))
  const cetteAnnee = `${annee}-${jourAnnuel}`
  return cetteAnnee >= aujourdhui ? cetteAnnee : `${annee + 1}-${jourAnnuel}`
}

// « aujourd'hui », « demain », « dans 12 jours », « hier », « en retard de 3 jours »
export function libelleDelai(jours) {
  if (jours === 0) return "aujourd'hui"
  if (jours === 1) return 'demain'
  if (jours > 1) return `dans ${jours} jours`
  if (jours === -1) return 'hier'
  return `en retard de ${-jours} jours`
}

// « jeudi 21 mai 2027 »
export function libelleDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(versDate(date))
}

// Répartition pour l'écran, chaque groupe trié par date
export function regrouper(echeances, aujourdhui, horizon = 30) {
  const groupes = { enRetard: [], bientot: [], plusTard: [], faites: [] }
  const triees = [...echeances].sort((a, b) => a.date.localeCompare(b.date))
  for (const e of triees) {
    const jours = joursRestants(e.date, aujourdhui)
    if (e.faite_le) groupes.faites.push(e)
    else if (jours < 0) groupes.enRetard.push(e)
    else if (jours <= horizon) groupes.bientot.push(e)
    else groupes.plusTard.push(e)
  }
  groupes.faites.reverse()
  return groupes
}

// Échéances à rappeler aujourd'hui (un rappel tombe ce jour-là), la plus
// proche d'abord : [{ echeance, jours }]
export function rappelsDuJour(echeances, aujourdhui) {
  return echeances
    .filter((e) => !e.faite_le)
    .map((e) => ({ echeance: e, jours: joursRestants(e.date, aujourdhui) }))
    .filter(({ echeance, jours }) => jours >= 0 && (echeance.rappels ?? []).includes(jours))
    .sort((a, b) => a.jours - b.jours)
}

// « Fait » : une échéance récurrente passe à sa prochaine date (après
// aujourd'hui si elle était très en retard), une ponctuelle est terminée.
// Renvoie les champs à mettre à jour.
export function marquerFaite(echeance, aujourdhui, maintenant = new Date()) {
  if (echeance.recurrence === 'aucune') return { faite_le: maintenant.toISOString() }
  let date = dateSuivante(echeance.date, echeance.recurrence)
  while (date < aujourdhui) date = dateSuivante(date, echeance.recurrence)
  return { date, faite_le: null }
}
