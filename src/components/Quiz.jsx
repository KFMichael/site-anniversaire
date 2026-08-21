import { useEffect, useMemo, useState } from 'react'
import { questions, getActiviteSuggeree } from '../data/activites'
import { supabase } from '../lib/supabase'

const DUREES = [
  { label: '⏱️ 30 min', minutes: 30 },
  { label: '🕐 1h', minutes: 60 },
  { label: '🕑 2h', minutes: 120 },
  { label: '☀️ Journée', minutes: 480 },
]

const DESCRIPTION_EVENEMENT = 'Généré depuis notre site anniversaire'

// Indice d'ambiance affiché avant le nom complet de l'activité, composé
// à partir des axes actif/créatif du profil de réponses (5 axes au total,
// on n'en retient que 2 pour garder une phrase courte et lisible)
function indiceAmbiance(reponses) {
  const energie = reponses.actif === 1 ? 'plutôt actif' : 'plutôt calme'
  const posture =
    reponses.creatif === 1 ? 'où tu crées de tes mains' : 'où tu te laisses porter'
  return `Quelque chose ${energie}, ${posture}…`
}

// Exclut du tirage les activités des 5 dernières entrées du carnet
// (tous statuts confondus), pour ne pas répéter une activité récente.
// Ne bloque jamais : en cas d'erreur réseau, on tire sans exclusion.
async function recupererExclusionsRecentes() {
  try {
    const { data, error } = await supabase
      .from('activites_carnet')
      .select('nom_activite')
      .order('date', { ascending: false })
      .limit(5)
    if (!error && data) return data.map((entree) => entree.nom_activite)
  } catch {
    // on ignore, le tirage se fait alors sans exclusion
  }
  return []
}

function pad(n) {
  return String(n).padStart(2, '0')
}

// Format local "flottant" (sans fuseau) attendu par Google Calendar et l'ICS
function formatDateLocale(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(
    date.getHours()
  )}${pad(date.getMinutes())}00`
}

// DTSTAMP doit être en UTC selon la RFC5545
function formatDateUTC(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function slugifier(texte) {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function construireLienGoogleCalendar(activite, dtDebut, dtFin) {
  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', activite)
  url.searchParams.set('dates', `${formatDateLocale(dtDebut)}/${formatDateLocale(dtFin)}`)
  url.searchParams.set('details', DESCRIPTION_EVENEMENT)
  return url.toString()
}

function construireICS(activite, dtDebut, dtFin) {
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Site Anniversaire//FR',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@site-anniversaire`,
    `DTSTAMP:${formatDateUTC(new Date())}`,
    `DTSTART:${formatDateLocale(dtDebut)}`,
    `DTEND:${formatDateLocale(dtFin)}`,
    `SUMMARY:${activite}`,
    `DESCRIPTION:${DESCRIPTION_EVENEMENT}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lignes.join('\r\n')
}

function telechargerICS(activite, dtDebut, dtFin) {
  const contenu = construireICS(activite, dtDebut, dtFin)
  const blob = new Blob([contenu], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = `${slugifier(activite)}.ics`
  document.body.appendChild(lien)
  lien.click()
  document.body.removeChild(lien)
  URL.revokeObjectURL(url)
}

function ajourdhuiISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Durées (ms) de l'écran teasing puis de l'indice, avant le nom complet.
// Cumul volontairement court (~2.4s), resserré depuis le passage à 5
// questions pour que le parcours ne traîne pas en longueur.
const DUREE_TEASING = 1400
const DUREE_INDICE = 1000

export default function Quiz({ mood }) {
  const [reponses, setReponses] = useState({})
  const [etape, setEtape] = useState(0)
  const [activite, setActivite] = useState(null)

  // 'teasing' -> 'indice' -> 'resultat', séquence de révélation en couches
  const [etapeResultat, setEtapeResultat] = useState('teasing')
  // Fondu d'entrée générique, rejoué à chaque changement de phase/question
  const [phaseVisible, setPhaseVisible] = useState(false)
  const [carteVisible, setCarteVisible] = useState(false)

  const [valide, setValide] = useState(false)
  const [dateChoisie, setDateChoisie] = useState('')
  const [heureChoisie, setHeureChoisie] = useState('')
  const [dureeMinutes, setDureeMinutes] = useState(null)
  const [ajouteAuCarnet, setAjouteAuCarnet] = useState(false)
  const [carnetEnregistre, setCarnetEnregistre] = useState(false)

  const questionActuelle = questions[etape]
  const termine = etape >= questions.length

  async function repondre(valeur) {
    const nouvellesReponses = { ...reponses, [questionActuelle.id]: valeur }
    setReponses(nouvellesReponses)

    const prochaineEtape = etape + 1
    setEtape(prochaineEtape)

    if (prochaineEtape >= questions.length) {
      const exclusions = await recupererExclusionsRecentes()
      setActivite(getActiviteSuggeree(nouvellesReponses, exclusions))
    }
  }

  async function retirer() {
    setValide(false)
    setAjouteAuCarnet(false)
    setCarnetEnregistre(false)
    const exclusions = await recupererExclusionsRecentes()
    setActivite(getActiviteSuggeree(reponses, exclusions))
  }

  function recommencer() {
    setReponses({})
    setEtape(0)
    setActivite(null)
    setEtapeResultat('teasing')
    setValide(false)
    setDateChoisie('')
    setHeureChoisie('')
    setDureeMinutes(null)
    setAjouteAuCarnet(false)
    setCarnetEnregistre(false)
  }

  function changerActivite() {
    setValide(false)
    setAjouteAuCarnet(false)
    setCarnetEnregistre(false)
  }

  // Glissement/fondu léger à chaque nouvelle question
  useEffect(() => {
    if (termine) return
    setCarteVisible(false)
    const t = setTimeout(() => setCarteVisible(true), 20)
    return () => clearTimeout(t)
  }, [etape, termine])

  // Séquence "je réfléchis…" -> indice d'ambiance -> nom complet
  useEffect(() => {
    if (!activite) return
    setEtapeResultat('teasing')
    const t1 = setTimeout(() => setEtapeResultat('indice'), DUREE_TEASING)
    const t2 = setTimeout(
      () => setEtapeResultat('resultat'),
      DUREE_TEASING + DUREE_INDICE
    )
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [activite])

  // Petit fondu d'entrée rejoué à chaque changement de phase du résultat
  useEffect(() => {
    setPhaseVisible(false)
    const t = setTimeout(() => setPhaseVisible(true), 30)
    return () => clearTimeout(t)
  }, [etapeResultat])

  const dtDebut = useMemo(
    () =>
      valide && dateChoisie && heureChoisie
        ? new Date(`${dateChoisie}T${heureChoisie}`)
        : null,
    [valide, dateChoisie, heureChoisie]
  )
  const dtFin = useMemo(
    () => (dtDebut && dureeMinutes ? new Date(dtDebut.getTime() + dureeMinutes * 60000) : null),
    [dtDebut, dureeMinutes]
  )
  const planComplet = Boolean(dtDebut && dtFin)

  // Dès que date + heure + durée sont confirmées, on enregistre l'activité
  // dans le carnet (à l'avance, note/photo restent vides jusqu'au vécu).
  useEffect(() => {
    if (!planComplet || ajouteAuCarnet) return
    setAjouteAuCarnet(true)

    supabase
      .from('activites_carnet')
      .insert({
        nom_activite: activite,
        date_activite: dtDebut.toISOString(),
        mood_debut: mood ?? null,
        date: new Date().toISOString(),
        note: null,
        commentaire: null,
        photo_url: null,
      })
      .then(({ error }) => {
        if (error) {
          setAjouteAuCarnet(false)
        } else {
          setCarnetEnregistre(true)
        }
      })
  }, [planComplet, ajouteAuCarnet, activite, dtDebut, mood])

  const enRevelation = termine && etapeResultat === 'resultat'

  return (
    <section className="min-h-screen relative flex flex-col items-center justify-center px-6 py-16 bg-bg-base overflow-hidden">
      {!termine && (
        <div className="max-w-md w-full flex flex-col items-center gap-8">
          <div className="w-full">
            <p className="font-sans text-xs uppercase tracking-widest text-text-muted mb-2 text-center">
              Question {etape + 1} / {questions.length}
            </p>
            <div className="w-full h-1.5 rounded-full bg-separator overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500 ease-spring"
                style={{ width: `${(etape / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div
            key={etape}
            className={`w-full text-center space-y-10 transition-all duration-300 ease-spring ${
              carteVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
            }`}
          >
            <p className="font-sans text-2xl md:text-3xl font-semibold text-text-primary leading-snug">
              {questionActuelle.texte}
            </p>
            <div className="flex flex-col gap-4">
              {questionActuelle.reponses.map((r) => (
                <button
                  key={r.valeur}
                  onClick={() => repondre(r.valeur)}
                  className="font-sans px-6 py-4 rounded-2xl border border-separator text-text-secondary transition-all duration-200 ease-spring active:scale-95 hover:bg-accent/10 hover:text-text-primary hover:border-accent"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {termine && etapeResultat === 'teasing' && (
        <div
          className={`relative z-10 flex flex-col items-center gap-2 transition-opacity duration-500 ease-spring ${
            phaseVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p className="font-sans text-2xl md:text-3xl italic text-text-secondary">
            Je réfléchis
            <span className="dot-pulse inline-flex ml-1 align-baseline">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </p>
        </div>
      )}

      {termine && etapeResultat === 'indice' && (
        <div
          className={`relative z-10 max-w-md flex flex-col items-center gap-3 text-center transition-all duration-500 ease-spring ${
            phaseVisible ? 'opacity-100 blur-none' : 'opacity-0 blur-[2px]'
          }`}
        >
          <p className="font-sans text-xs uppercase tracking-widest text-text-muted">
            On y est presque
          </p>
          <p className="font-sans text-2xl md:text-3xl font-medium text-text-secondary">
            {indiceAmbiance(reponses)}
          </p>
        </div>
      )}

      {enRevelation && (
        <div className="relative z-10 max-w-md w-full text-center space-y-6">
          <p
            className={`font-sans text-sm uppercase tracking-widest text-text-muted transition-opacity duration-700 ease-spring ${
              phaseVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Notre suggestion
          </p>
          <p
            className={`font-sans text-4xl md:text-5xl font-bold text-accent leading-tight transition-all duration-700 ease-spring ${
              phaseVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-3'
            }`}
          >
            {activite}
          </p>

          {!valide && (
            <div
              className={`flex flex-col items-center gap-3 pt-4 transition-opacity duration-700 ease-spring delay-300 ${
                phaseVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <button
                onClick={() => setValide(true)}
                className="font-sans px-8 py-3 rounded-full bg-accent text-white font-medium transition-all duration-200 ease-spring hover:opacity-90 active:scale-95"
              >
                Valider cette activité ✅
              </button>
              <button
                onClick={retirer}
                className="font-sans text-sm text-text-muted hover:text-text-secondary underline transition-colors duration-200 ease-spring active:scale-95"
              >
                Tirer une autre idée
              </button>
              <button
                onClick={recommencer}
                className="font-sans text-sm text-text-muted hover:text-text-secondary underline transition-colors duration-200 ease-spring active:scale-95"
              >
                Recommencer le quiz
              </button>
            </div>
          )}

          {valide && (
            <div className="text-left space-y-5 pt-2">
              <div>
                <label className="font-sans block text-sm text-text-muted mb-1">
                  Date
                </label>
                <div className="rounded-2xl border border-separator bg-bg-elevated px-4 py-2 transition-colors duration-200 ease-spring focus-within:border-accent">
                  <input
                    type="date"
                    min={ajourdhuiISO()}
                    value={dateChoisie}
                    onChange={(e) => setDateChoisie(e.target.value)}
                    className="font-sans w-full bg-transparent text-text-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-sans block text-sm text-text-muted mb-1">
                  Heure de début
                </label>
                <div className="rounded-2xl border border-separator bg-bg-elevated px-4 py-2 transition-colors duration-200 ease-spring focus-within:border-accent">
                  <input
                    type="time"
                    value={heureChoisie}
                    onChange={(e) => setHeureChoisie(e.target.value)}
                    className="font-sans w-full bg-transparent text-text-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-sans block text-sm text-text-muted mb-1">
                  Durée
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DUREES.map((d) => (
                    <button
                      key={d.minutes}
                      onClick={() => setDureeMinutes(d.minutes)}
                      className={`font-sans text-sm px-2 py-2 rounded-2xl border transition-all duration-200 ease-spring active:scale-95 ${
                        dureeMinutes === d.minutes
                          ? 'bg-accent text-white border-transparent'
                          : 'border-separator text-text-secondary hover:border-accent'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {planComplet && (
                <div className="flex flex-col gap-3 pt-2">
                  <a
                    href={construireLienGoogleCalendar(activite, dtDebut, dtFin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-center px-6 py-3 rounded-full bg-accent text-white font-medium transition-all duration-200 ease-spring hover:opacity-90 active:scale-95"
                  >
                    📅 Ajouter à Google Calendar
                  </a>
                  <button
                    onClick={() => telechargerICS(activite, dtDebut, dtFin)}
                    className="font-sans px-6 py-3 rounded-full border border-separator text-text-secondary transition-all duration-200 ease-spring active:scale-95 hover:bg-accent/10 hover:text-text-primary hover:border-accent"
                  >
                    ⬇️ Télécharger le fichier .ics
                  </button>
                </div>
              )}

              {carnetEnregistre && (
                <p className="font-sans text-sm text-center text-text-secondary italic pt-1">
                  C'est noté. On se retrouve là-bas.
                </p>
              )}

              <div className="text-center pt-2">
                <button
                  onClick={changerActivite}
                  className="font-sans text-xs text-text-muted hover:text-text-secondary underline transition-colors duration-200 ease-spring active:scale-95"
                >
                  ← Changer d'activité
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
