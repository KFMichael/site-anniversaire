import { useEffect, useState } from 'react'
import { questions, getActiviteSuggeree } from '../data/activites'

const DUREES = [
  { label: '30 min', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: 'Journée', minutes: 480 },
]

const DESCRIPTION_EVENEMENT = 'Généré depuis notre site anniversaire'

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

export default function Quiz() {
  const [reponses, setReponses] = useState({})
  const [etape, setEtape] = useState(0)
  const [activite, setActivite] = useState(null)
  const [revele, setRevele] = useState(false)

  const [valide, setValide] = useState(false)
  const [dateChoisie, setDateChoisie] = useState('')
  const [heureChoisie, setHeureChoisie] = useState('')
  const [dureeMinutes, setDureeMinutes] = useState(null)

  const questionActuelle = questions[etape]
  const termine = etape >= questions.length

  function repondre(valeur) {
    const nouvellesReponses = { ...reponses, [questionActuelle.id]: valeur }
    setReponses(nouvellesReponses)

    const prochaineEtape = etape + 1
    setEtape(prochaineEtape)

    if (prochaineEtape >= questions.length) {
      setActivite(
        getActiviteSuggeree(nouvellesReponses.axe1, nouvellesReponses.axe2)
      )
    }
  }

  function retirer() {
    setRevele(false)
    setActivite(getActiviteSuggeree(reponses.axe1, reponses.axe2))
  }

  function recommencer() {
    setReponses({})
    setEtape(0)
    setActivite(null)
    setRevele(false)
    setValide(false)
    setDateChoisie('')
    setHeureChoisie('')
    setDureeMinutes(null)
  }

  // Petit temps de suspense avant que le résultat n'apparaisse
  useEffect(() => {
    if (!activite) return
    setRevele(false)
    const t = setTimeout(() => setRevele(true), 400)
    return () => clearTimeout(t)
  }, [activite])

  const dtDebut =
    valide && dateChoisie && heureChoisie
      ? new Date(`${dateChoisie}T${heureChoisie}`)
      : null
  const dtFin =
    dtDebut && dureeMinutes ? new Date(dtDebut.getTime() + dureeMinutes * 60000) : null
  const planComplet = Boolean(dtDebut && dtFin)

  return (
    <section className="min-h-screen relative flex flex-col items-center justify-center px-6 py-16 bg-bg-base overflow-hidden">
      {termine && (
        <div
          className={`absolute inset-0 blur-3xl gradient-sunset transition-opacity duration-1000 ${
            revele ? 'opacity-30' : 'opacity-0'
          }`}
          style={{ maskImage: 'radial-gradient(circle at center, black, transparent 70%)' }}
          aria-hidden="true"
        />
      )}

      {!termine && (
        <div className="max-w-md w-full text-center space-y-10">
          <p className="font-display text-2xl md:text-3xl font-semibold text-text-primary leading-snug">
            {questionActuelle.texte}
          </p>
          <div className="flex flex-col gap-4">
            {questionActuelle.reponses.map((r) => (
              <button
                key={r.valeur}
                onClick={() => repondre(r.valeur)}
                className="font-sans px-6 py-4 rounded-xl border border-white/20 text-text-secondary hover:bg-white/10 hover:text-text-primary hover:border-white/30 transition-all"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {termine && (
        <div className="relative z-10 max-w-md w-full text-center space-y-6">
          <p
            className={`font-sans text-sm uppercase tracking-widest text-text-muted transition-opacity duration-700 ${
              revele ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Notre suggestion
          </p>
          <p
            className={`font-display text-4xl md:text-5xl font-bold gradient-sunset-text leading-tight transition-all duration-700 ${
              revele ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-3'
            }`}
          >
            {activite}
          </p>

          {!valide && (
            <div
              className={`flex flex-col items-center gap-3 pt-4 transition-opacity duration-700 delay-300 ${
                revele ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <button
                onClick={() => setValide(true)}
                className="font-sans px-8 py-3 rounded-full gradient-sunset text-white font-medium hover:opacity-90 transition-opacity"
              >
                Valider cette activité
              </button>
              <button
                onClick={retirer}
                className="font-sans text-sm text-text-muted hover:text-text-secondary underline transition-colors"
              >
                Tirer une autre idée
              </button>
              <button
                onClick={recommencer}
                className="font-sans text-sm text-text-muted hover:text-text-secondary underline transition-colors"
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
                <div className="rounded-lg border border-white/20 bg-bg-base px-4 py-2 focus-within:border-white/40">
                  <input
                    type="date"
                    min={ajourdhuiISO()}
                    value={dateChoisie}
                    onChange={(e) => setDateChoisie(e.target.value)}
                    className="font-sans w-full bg-transparent text-text-primary [color-scheme:dark] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-sans block text-sm text-text-muted mb-1">
                  Heure de début
                </label>
                <div className="rounded-lg border border-white/20 bg-bg-base px-4 py-2 focus-within:border-white/40">
                  <input
                    type="time"
                    value={heureChoisie}
                    onChange={(e) => setHeureChoisie(e.target.value)}
                    className="font-sans w-full bg-transparent text-text-primary [color-scheme:dark] focus:outline-none"
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
                      className={`font-sans text-sm px-2 py-2 rounded-lg border transition-all ${
                        dureeMinutes === d.minutes
                          ? 'gradient-sunset text-white border-transparent'
                          : 'border-white/20 text-text-secondary hover:border-white/40'
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
                    className="font-sans text-center px-6 py-3 rounded-full gradient-sunset text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    Ajouter à Google Calendar
                  </a>
                  <button
                    onClick={() => telechargerICS(activite, dtDebut, dtFin)}
                    className="font-sans px-6 py-3 rounded-full border border-white/20 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-all"
                  >
                    Télécharger le fichier .ics
                  </button>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  onClick={() => setValide(false)}
                  className="font-sans text-xs text-text-muted hover:text-text-secondary underline transition-colors"
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
