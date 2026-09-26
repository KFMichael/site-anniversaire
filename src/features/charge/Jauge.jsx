import { couleurMembre } from './calculs'

// Barre empilée : la part des points de chaque membre, et ce qui reste libre
export default function Jauge({ repartition, membres }) {
  const { parMembre, libres, total } = repartition
  if (total === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-4 w-full rounded-full overflow-hidden bg-separator"
        role="img"
        aria-label={parMembre
          .map((p, i) => `${membres[i]?.prenom} : ${p.points} points`)
          .concat(libres.points ? [`sans responsable : ${libres.points} points`] : [])
          .join(', ')}
      >
        {parMembre.map((p, i) =>
          p.points > 0 ? (
            <div
              key={p.user_id}
              className="h-full transition-all duration-500 ease-spring"
              style={{ width: `${(p.points / total) * 100}%`, backgroundColor: couleurMembre(i) }}
            />
          ) : null
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {parMembre.map((p, i) => (
          <li key={p.user_id} className="flex items-center gap-2 font-sans text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: couleurMembre(i) }}
              aria-hidden="true"
            />
            <span className="text-text-primary flex-1">{membres[i]?.prenom}</span>
            <span className="text-text-muted">
              {p.nombre} charge{p.nombre > 1 ? 's' : ''} · <strong className="text-text-primary">{p.points} pts</strong>
            </span>
          </li>
        ))}
        {libres.nombre > 0 && (
          <li className="flex items-center gap-2 font-sans text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-separator" aria-hidden="true" />
            <span className="text-text-muted flex-1">Sans responsable</span>
            <span className="text-text-muted">
              {libres.nombre} charge{libres.nombre > 1 ? 's' : ''} · {libres.points} pts
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}
