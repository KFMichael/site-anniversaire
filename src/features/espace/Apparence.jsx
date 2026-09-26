import { useState } from 'react'
import { Carte } from '../../components/ui'
import { choisirTheme, lireTheme, THEMES } from '../../lib/theme'

export default function Apparence() {
  const [theme, setTheme] = useState(lireTheme)

  function changer(id) {
    setTheme(id)
    choisirTheme(id)
  }

  return (
    <Carte titre="Apparence">
      <div role="radiogroup" aria-label="Thème" className="flex p-1 rounded-full bg-bg-base">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={theme === t.id}
            onClick={() => changer(t.id)}
            className={`font-sans flex-1 text-sm py-2 rounded-full transition-all duration-200 ease-spring ${
              theme === t.id ? 'bg-bg-elevated text-text-primary font-medium shadow-soft' : 'text-text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="font-sans text-xs text-text-muted">
        {theme === 'systeme'
          ? "Suit le réglage clair / sombre de l'appareil."
          : 'Mémorisé sur cet appareil uniquement.'}
      </p>
    </Carte>
  )
}
