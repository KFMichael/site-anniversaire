import { NavLink, Outlet } from 'react-router-dom'

// Barre d'onglets façon iOS, fixée en bas de l'écran. Les futurs modules
// (charge mentale, courses, menus…) viendront s'y ajouter.
const ONGLETS = [
  { to: '/', label: 'Accueil', Icone: IconeMaison, fin: true },
  { to: '/coffre', label: 'Coffre', Icone: IconeCadenas },
  { to: '/activites', label: 'Activités', Icone: IconeEtoile },
  { to: '/espace', label: 'Espace', Icone: IconeGroupe },
]

export default function Structure() {
  return (
    <>
      <Outlet />
      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 inset-x-0 z-20 bg-bg-elevated-glass backdrop-blur-xl border-t border-separator pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="max-w-md mx-auto flex justify-around">
          {ONGLETS.map(({ to, label, Icone, fin }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={fin}
                className={({ isActive }) =>
                  `font-sans flex flex-col items-center gap-0.5 px-4 py-2 text-[11px] transition-colors duration-200 ease-spring ${
                    isActive ? 'text-accent' : 'text-text-muted hover:text-text-primary'
                  }`
                }
              >
                <Icone />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

function IconeMaison() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  )
}

function IconeCadenas() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2" />
    </svg>
  )
}

function IconeEtoile() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  )
}

function IconeGroupe() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4" />
      <path d="M18.5 14.4c1.9.8 3 2.9 3 5.6" />
    </svg>
  )
}
