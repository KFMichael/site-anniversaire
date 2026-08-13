import { useState } from 'react'
import { questions, getActiviteSuggeree } from '../data/activites'

export default function Quiz() {
  const [reponses, setReponses] = useState({})
  const [etape, setEtape] = useState(0)
  const [activite, setActivite] = useState(null)

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
    setActivite(getActiviteSuggeree(reponses.axe1, reponses.axe2))
  }

  function recommencer() {
    setReponses({})
    setEtape(0)
    setActivite(null)
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-bg-base">
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
        <div className="max-w-md w-full text-center space-y-6">
          <p className="font-sans text-sm uppercase tracking-widest text-text-muted">
            Notre suggestion
          </p>
          <p className="font-display text-3xl md:text-4xl font-semibold gradient-sunset-text">
            {activite}
          </p>
          <div className="flex flex-col items-center gap-3 pt-4">
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
        </div>
      )}
    </section>
  )
}
