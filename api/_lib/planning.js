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
