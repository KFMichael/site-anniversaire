import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Accueil from './components/Accueil'
import Quiz from './components/Quiz'
import CarteVoyages from './components/CarteVoyages'
import MurMessages from './components/MurMessages'
import CarnetActivites from './components/CarnetActivites'
import AdminMotsPasse from './components/AdminMotsPasse'

const SECTIONS = [
  { id: 'quiz', label: 'Activité surprise', Composant: Quiz, actif: true },
  { id: 'carte', label: 'Nos voyages', Composant: CarteVoyages, actif: false },
  { id: 'messages', label: 'Ils pensent à toi', Composant: MurMessages, actif: false },
  { id: 'carnet', label: 'Notre carnet', Composant: CarnetActivites, actif: true },
]

const SECTIONS_VISIBLES = SECTIONS.filter((s) => s.actif)

function SiteAnniversaire() {
  const [entree, setEntree] = useState(false)
  const [sectionActive, setSectionActive] = useState('quiz')
  // Humeur du jour, choisie sur l'écran d'accueil, gardée en mémoire pour
  // la session (pas encore en base) et utilisée à la validation du quiz.
  const [mood, setMood] = useState(null)

  if (!entree) {
    return (
      <Accueil
        onEntrer={(moodChoisi) => {
          setMood(moodChoisi)
          setEntree(true)
        }}
      />
    )
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
      {SectionActuelle && <SectionActuelle mood={mood} />}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pas de lien visible : page d'admin accessible uniquement en connaissant l'URL */}
        <Route path="/admin-zMd_uRSay5JaTurR" element={<AdminMotsPasse />} />
        <Route path="/*" element={<SiteAnniversaire />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
