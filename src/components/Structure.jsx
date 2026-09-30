import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { MessagesProvider } from './Messages'

// Barre d'onglets façon iOS, fixée en bas de l'écran : 5 onglets au plus,
// pour ce qui sert chaque jour. Les autres modules sont dans « Plus ».
const ONGLETS = [
  { to: '/', label: "Aujourd'hui", Icone: IconeMaison },
  { to: '/courses', label: 'Courses', Icone: IconePanier },
  { to: '/menus', label: 'Menus', Icone: IconeCouverts },
  { to: '/charge', label: 'Charge', Icone: IconeListe },
  { to: '/plus', label: 'Plus', Icone: IconePlus },
]

// Modules ouverts depuis « Plus » : l'onglet Plus reste allumé pour qu'on
// sache toujours où l'on est. Les réglages de l'espace s'ouvrent depuis
// l'avatar d'« Aujourd'hui » ou depuis « Plus » (onglet de provenance).
const MODULES_PLUS = ['/plus', '/finances', '/listes', '/echeances', '/sport', '/activites', '/coffre']

function ongletActif(pathname, depuis) {
  const dans = (m) => pathname === m || pathname.startsWith(`${m}/`)
  if (MODULES_PLUS.some(dans) || (dans('/espace') && depuis === 'plus')) return '/plus'
  if (dans('/espace')) return '/'
  return ONGLETS.find((o) => o.to !== '/' && dans(o.to))?.to ?? (pathname === '/' ? '/' : null)
}

export default function Structure() {
  const { pathname, state } = useLocation()
  const actif = ongletActif(pathname, state?.depuis)

  // Chaque nouvel écran s'ouvre en haut de page
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <MessagesProvider>
      <Outlet />
      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 inset-x-0 z-20 bg-bg-elevated-glass backdrop-blur-xl border-t border-separator pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="max-w-md mx-auto flex justify-around">
          {ONGLETS.map(({ to, label, Icone }) => (
            <li key={to}>
              <Link
                to={to}
                aria-current={actif === to ? 'page' : undefined}
                className={`font-sans min-w-16 flex flex-col items-center gap-0.5 px-2 py-2 text-[11px] transition-colors duration-200 ease-spring ${
                  actif === to ? 'text-accent-text' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Icone />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </MessagesProvider>
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

function IconePanier() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h2l2.2 11h10.6L20 7.5H6.2" />
      <circle cx="9" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </svg>
  )
}

function IconeCouverts() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3v7a2 2 0 0 0 2 2v9" />
      <path d="M10 3v7a2 2 0 0 1-2 2" />
      <path d="M8 3v5" />
      <path d="M17.5 21V3c-2 1-3.5 3.5-3.5 7 0 2 1 3 3.5 3" />
    </svg>
  )
}

function IconePlus() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </svg>
  )
}
