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
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      {!termine && (
        <div className="max-w-md w-full text-center space-y-10">
          <p className="text-2xl md:text-3xl font-light text-neutral-900 leading-snug">
            {questionActuelle.texte}
          </p>
          <div className="flex flex-col gap-4">
            {questionActuelle.reponses.map((r) => (
              <button
                key={r.valeur}
                onClick={() => repondre(r.valeur)}
                className="px-6 py-4 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {termine && (
        <div className="max-w-md w-full text-center space-y-6">
          <p className="text-sm uppercase tracking-widest text-neutral-400">
            Notre suggestion
          </p>
          <p className="text-2xl md:text-3xl font-light text-neutral-900">
            {activite}
          </p>
          <div className="flex flex-col items-center gap-3 pt-4">
            <button
              onClick={retirer}
              className="text-sm text-neutral-400 hover:text-neutral-700 underline"
            >
              Tirer une autre idée
            </button>
            <button
              onClick={recommencer}
              className="text-sm text-neutral-400 hover:text-neutral-700 underline"
            >
              Recommencer le quiz
            </button>
          </div>
        </div>
      )}
    </section>
  )
}