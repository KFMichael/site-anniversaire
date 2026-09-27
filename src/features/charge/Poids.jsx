import { POIDS } from './calculs'

// ●●○ : le poids d'une charge en un coup d'œil
export function PoidsPastilles({ poids, couleur = 'text-text-muted' }) {
  const label = POIDS.find((p) => p.valeur === poids)?.label
  return (
    <span className={`font-sans text-xs whitespace-nowrap ${couleur}`} title={`Poids : ${label}`}>
      <span aria-hidden="true">{'●'.repeat(poids)}{'○'.repeat(3 - poids)}</span>
      <span className="sr-only">Poids : {label}</span>
    </span>
  )
}

export function ChoixPoids({ valeur, onChange }) {
  return (
    <div role="radiogroup" aria-label="Poids" className="flex gap-1 p-1 rounded-full bg-bg-base">
      {POIDS.map((p) => (
        <button
          key={p.valeur}
          type="button"
          role="radio"
          aria-checked={valeur === p.valeur}
          onClick={() => onChange(p.valeur)}
          className={`cible-44 font-sans text-xs px-3 py-1.5 rounded-full transition-all duration-200 ease-spring ${
            valeur === p.valeur ? 'bg-bg-elevated text-text-primary shadow-soft' : 'text-text-muted'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
