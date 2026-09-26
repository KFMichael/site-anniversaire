import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

// Ex-site anniversaire, conservé comme « boîte à idées » de l'espace :
// quiz pour trouver une activité, carnet des activités faites, carte des
// voyages et mur de messages.
const SOUS_SECTIONS = [
  { to: 'idees', label: 'Idées' },
  { to: 'carnet', label: 'Carnet' },
  { to: 'voyages', label: 'Voyages' },
  { to: 'messages', label: 'Messages' },
]

export default function Activites() {
  const location = useLocation()

  return (
    <div className="bg-bg-base min-h-screen pb-20">
      <nav aria-label="Rubriques des activités" className="sticky top-0 z-10 bg-bg-elevated-glass backdrop-blur-xl border-b border-separator">
        <ul className="flex flex-wrap justify-center gap-1 md:gap-4 py-3 px-4 text-sm font-sans">
          {SOUS_SECTIONS.map((s) => (
            <li key={s.to}>
              <NavLink
                to={s.to}
                className={({ isActive }) =>
                  `block px-4 py-1.5 rounded-full transition-all duration-200 ease-spring active:scale-95 ${
                    isActive
                      ? 'bg-accent text-white font-medium'
                      : 'text-text-muted hover:text-text-primary'
                  }`
                }
              >
                {s.label}
              </NavLink>
            </li>
          ))}
          <li>
            <Link
              to="/surprise"
              className="block px-4 py-1.5 rounded-full text-text-muted hover:text-text-primary transition-all duration-200 ease-spring active:scale-95"
            >
              Mode surprise 🎁
            </Link>
          </li>
        </ul>
      </nav>
      {/* key : rejoue le quiz depuis le début quand on revient du mode surprise */}
      <main>
        <h1 className="sr-only">Activités</h1>
        <Outlet key={location.key} />
        <p className="text-center pb-6">
          <Link
            to="/activites/surprise"
            className="inline-block py-3 font-sans text-xs text-text-muted hover:text-text-primary underline"
          >
            Réglages du mode surprise
          </Link>
        </p>
      </main>
    </div>
  )
}
