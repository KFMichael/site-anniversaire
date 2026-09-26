import { NavLink, Outlet } from 'react-router-dom'

// Barre d'onglets façon iOS, fixée en bas de l'écran : 5 onglets au plus.
// Les autres modules (Activités…) s'ouvrent depuis le tableau de bord.
const ONGLETS = [
  { to: '/', label: 'Accueil', Icone: IconeMaison, fin: true },
  { to: '/courses', label: 'Courses', Icone: IconePanier },
  { to: '/charge', label: 'Charge', Icone: IconeListe },
  { to: '/coffre', label: 'Coffre', Icone: IconeCadenas },
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
                  `font-sans flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] transition-colors duration-200 ease-spring ${
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

function IconeListe() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 6.5 1.5 1.5L8 5.5" />
      <path d="m4 12.5 1.5 1.5L8 11.5" />
      <path d="M4.5 18.5h3" />
      <path d="M11 7h9" />
      <path d="M11 13h9" />
      <path d="M11 18.5h9" />
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

function IconePanier() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h2l2.2 11h10.6L20 7.5H6.2" />
      <circle cx="9" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
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
