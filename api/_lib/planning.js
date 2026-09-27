// Quoi envoyer, et quand (logique pure, testée par planning.test.js).
import { decalerJours, joursDeLaSemaine } from '../../src/features/menus/tirage.js'

// Date du jour dans le fuseau du foyer : { iso: 'AAAA-MM-JJ', jourSemaine: 0 (dim) à 6 }
export function dateLocale(instant, fuseau) {
  const parties = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: fuseau,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value])
  )
  const jours = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    iso: `${parties.year}-${parties.month}-${parties.day}`,
    jourSemaine: jours[parties.weekday],
  }
}

// Envois prévus pour un jour donné :
// - le dimanche, le récap de la semaine qui commence le lendemain ;
// - le 1er du mois, le rappel de la charge mentale du mois.
// Renvoie [{ type, periode }] (vide la plupart des jours).
export function envoisDuJour({ iso, jourSemaine }) {
  const envois = []
  if (jourSemaine === 0) envois.push({ type: 'hebdo', periode: decalerJours(iso, 1) })
  if (iso.endsWith('-01')) envois.push({ type: 'mensuel', periode: iso.slice(0, 7) })
  return envois
}

// Période couverte par un email : la semaine (lundi → dimanche) et le mois
// dont on parle. Le récap du dimanche parle de la semaine suivante, et du
// mois de son lundi.
export function periodeCouverte(iso, envois) {
  const hebdo = envois.find((e) => e.type === 'hebdo')
  const lundi = hebdo ? hebdo.periode : null
  const mois = `${(lundi ?? iso).slice(0, 7)}-01`
  return { jours: lundi ? joursDeLaSemaine(lundi) : [], mois }
}

// « 18h30–19h15 » : horaire d'une séance de sport dans le fuseau du foyer
export function horaireSeance(seance, fuseau) {
  const debut = new Date(seance.debut)
  const fin = new Date(debut.getTime() + seance.duree_minutes * 60000)
  const heure = (d) =>
    new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, hour: '2-digit', minute: '2-digit' }).format(d).replace(':', 'h')
  return `${heure(debut)}–${heure(fin)}`
}

// Séances (non annulées) qui tombent sur l'un des jours donnés, dans l'ordre :
// [{ jour: 'AAAA-MM-JJ', horaire: '18h30–19h15' }]
export function seancesDesJours(seances, jours, fuseau) {
  const voulus = new Set(jours)
  return seances
    .filter((s) => !s.annulee)
    .map((s) => ({ debut: s.debut, jour: dateLocale(new Date(s.debut), fuseau).iso, horaire: horaireSeance(s, fuseau) }))
    .filter((s) => voulus.has(s.jour))
    .sort((a, b) => new Date(a.debut) - new Date(b.debut))
    .map(({ jour, horaire }) => ({ jour, horaire }))
}

// Bornes UTC larges pour lire les séances de ces jours (le filtrage exact
// par jour local est fait par seancesDesJours)
export function bornesSeances(jours) {
  const debut = new Date(`${jours[0]}T00:00:00Z`)
  const fin = new Date(`${jours[jours.length - 1]}T00:00:00Z`)
  debut.setUTCDate(debut.getUTCDate() - 1)
  fin.setUTCDate(fin.getUTCDate() + 2)
  return { debut: debut.toISOString(), fin: fin.toISOString() }
}
