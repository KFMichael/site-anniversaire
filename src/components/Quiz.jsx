import { useState } from 'react'
import { questions, getActivitesSuggerees } from '../data/activites'

export default function Quiz() {
  const [reponses, setReponses] = useState({})
  const [etape, setEtape] = useState(0)

  const questionActuelle = questions[etape]
  const termine = etape >= questions.length

  function repondre(valeur) {
    const nouvellesReponses = { ...reponses, [questionActuelle.id]: valeur }
    setReponses(nouvellesReponses)
    setEtape(etape + 1)
  }

  function recommencer() {
    setReponses({})
    setEtape(0)
  }

  const activitesSuggerees = termine
    ? getActivitesSuggerees(reponses.axe1, reponses.axe2)
    : []

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
          <ul className="space-y-2">
            {activitesSuggerees.map((a) => (
              <li key={a} className="text-xl font-light text-neutral-900">
                {a}
              </li>
            ))}
          </ul>
          <button
            onClick={recommencer}
            className="mt-8 text-sm text-neutral-400 hover:text-neutral-700 underline"
          >
            Recommencer
          </button>
        </div>
      )}
    </section>
  )
}
