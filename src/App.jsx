import { useState } from 'react'
import Accueil from './components/Accueil'
import Quiz from './components/Quiz'
import CarteVoyages from './components/CarteVoyages'
import MurMessages from './components/MurMessages'
import CarnetActivites from './components/CarnetActivites'

const SECTIONS = [
  { id: 'quiz', label: 'Activité surprise', Composant: Quiz, actif: true },
  { id: 'carte', label: 'Nos voyages', Composant: CarteVoyages, actif: false },
  { id: 'messages', label: 'Ils pensent à toi', Composant: MurMessages, actif: false },
  { id: 'carnet', label: 'Notre carnet', Composant: CarnetActivites, actif: true },
]

const SECTIONS_VISIBLES = SECTIONS.filter((s) => s.actif)

function App() {
  const [entree, setEntree] = useState(false)
  const [sectionActive, setSectionActive] = useState('quiz')

  if (!entree) {
    return <Accueil onEntrer={() => setEntree(true)} />
  }

  const SectionActuelle = SECTIONS_VISIBLES.find((s) => s.id === sectionActive)?.Composant

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-neutral-200">
        <ul className="flex flex-wrap justify-center gap-2 md:gap-6 py-4 px-4 text-sm">
          {SECTIONS_VISIBLES.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setSectionActive(s.id)}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  sectionActive === s.id
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {SectionActuelle && <SectionActuelle />}
    </div>
  )
}

export default App