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
    <div className="min-h-screen bg-bg-base">
      <nav className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur border-b border-white/10">
        <ul className="flex flex-wrap justify-center gap-2 md:gap-6 py-4 px-4 text-sm font-sans">
          {SECTIONS_VISIBLES.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setSectionActive(s.id)}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  sectionActive === s.id
                    ? 'gradient-sunset text-white'
                    : 'text-text-muted hover:text-text-primary'
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