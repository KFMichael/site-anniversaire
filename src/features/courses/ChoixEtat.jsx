import { COULEURS_ETAT, ETATS } from './rayons'

export function PastilleEtat({ etat }) {
  return (
    <span
      className="w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: COULEURS_ETAT[etat] }}
      aria-hidden="true"
    />
  )
}

// Trois boutons : il en reste / bientôt / fini
export default function ChoixEtat({ etat, onChange, nomProduit }) {
  return (
    <div role="radiogroup" aria-label={`État de ${nomProduit}`} className="flex gap-1 shrink-0">
      {ETATS.map((e) => {
        const actif = etat === e.id
        return (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={actif}
            aria-label={e.label}
            title={e.label}
            onClick={() => onChange(e.id)}
            className={`font-sans text-xs px-2.5 py-1.5 rounded-full border transition-all duration-200 ease-spring active:scale-95 flex items-center gap-1.5 ${
              actif ? 'text-text-primary font-medium' : 'border-transparent text-text-muted'
            }`}
            style={
              actif
                ? { borderColor: COULEURS_ETAT[e.id], backgroundColor: `${COULEURS_ETAT[e.id]}22` }
                : undefined
            }
          >
            <PastilleEtat etat={e.id} />
            {e.court}
          </button>
        )
      })}
    </div>
  )
}
