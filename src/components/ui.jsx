// Petites briques d'interface partagées par toutes les pages, pour garder
// le même rendu iOS partout (cartes, titres, boutons).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { NOM_APP } from '../config'
import { useGesteRetour } from '../lib/useGesteRetour'

// Pas d'animation d'entrée pour le tout premier écran affiché
let premierEcran = true

// Écran façon iOS :
// - grand titre qui, au défilement, se replie en petit titre centré dans une
//   barre fixe en haut (avec le bouton retour) ;
// - retour : bouton « ‹ Plus » en haut des écrans qui ne sont pas dans la
//   barre d'onglets ({ vers: '/plus', label: 'Plus' }, ou { onClick, label }
//   pour un sous-écran) ; dans l'appli installée, glisser depuis le bord
//   gauche fait de même ;
// - entrée en glissé depuis la droite (écran suivant), depuis la gauche
//   (retour) ou en fondu (onglet) ;
// - action : bouton à droite du grand titre.
// Le titre de l'onglet du navigateur suit la page.
export function Page({ titre, sousTitre, retour, action, children }) {
  const navigate = useNavigate()
  const { state } = useLocation()
  const navigation = useNavigationType()
  const pageRef = useRef(null)
  const titreRef = useRef(null)
  const [replie, setReplie] = useState(false)
  const [entree] = useState(() => {
    if (premierEcran) return ''
    if (state?.sens === 'retour' || navigation === 'POP') return 'animate-entree-gauche'
    return retour ? 'animate-entree-droite' : 'animate-entree-fondu'
  })

  useEffect(() => {
    premierEcran = false
    document.title = titre ? `${titre.replace(/\s*👋$/, '')} · ${NOM_APP}` : NOM_APP
  }, [titre])

  // Le grand titre sort de l'écran par le haut : barre compacte
  useEffect(() => {
    const h1 = titreRef.current
    if (!h1 || !('IntersectionObserver' in window)) return
    const observateur = new IntersectionObserver(([e]) => setReplie(!e.isIntersecting && e.boundingClientRect.top < 0))
    observateur.observe(h1)
    return () => observateur.disconnect()
  }, [titre])

  const vers = retour?.vers
  const onClick = retour?.onClick
  const revenir = useCallback(() => {
    if (vers) navigate(vers, { state: { sens: 'retour' } })
    else onClick?.()
  }, [vers, onClick, navigate])
  useGesteRetour(pageRef, retour ? revenir : null)

  const classesRetour =
    'self-start -ml-1 -mb-3 min-h-11 inline-flex items-center gap-1 px-1 font-sans text-base text-accent-text transition-transform duration-200 ease-spring active:scale-95'
  const chevron = (
    <span aria-hidden="true" className="text-2xl leading-none">
      ‹
    </span>
  )

  return (
    <>
      {titre && (
        // Doublon visuel du titre et du retour : masqué aux lecteurs d'écran
        // et hors du parcours clavier (les originaux restent dans la page)
        <div
          aria-hidden="true"
          className={`fixed top-0 inset-x-0 z-20 bg-bg-elevated-glass backdrop-blur-xl border-b border-separator pt-[env(safe-area-inset-top)] transition-transform duration-200 ease-spring ${
            replie ? 'translate-y-0' : '-translate-y-full invisible'
          }`}
        >
          <div className="max-w-2xl mx-auto h-11 px-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="min-w-0">
              {retour && (
                <button type="button" tabIndex={-1} onClick={revenir} className="min-h-11 max-w-full inline-flex items-center gap-1 px-1 font-sans text-base text-accent-text truncate">
                  {chevron}
                  <span className="truncate">{retour.label}</span>
                </button>
              )}
            </div>
            <span className="font-sans text-[17px] font-semibold text-text-primary truncate max-w-[50vw]">{titre}</span>
            <div />
          </div>
        </div>
      )}
      <main ref={pageRef} className="min-h-screen bg-bg-base px-4 pt-8 pb-28 md:pt-12">
        <div className={`max-w-2xl mx-auto flex flex-col gap-6 ${entree}`}>
          {retour &&
            (retour.vers ? (
              <Link to={retour.vers} state={{ sens: 'retour' }} className={classesRetour}>
                {chevron}
                {retour.label}
              </Link>
            ) : (
              <button type="button" onClick={retour.onClick} className={classesRetour}>
                {chevron}
                {retour.label}
              </button>
            ))}
          {titre && (
            <header className="flex items-start gap-3 px-1">
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <h1 ref={titreRef} className="font-sans text-3xl font-bold text-text-primary">
                  {titre}
                </h1>
                {sousTitre && <p className="font-sans text-text-muted">{sousTitre}</p>}
              </div>
              {action}
            </header>
          )}
          {children}
        </div>
      </main>
    </>
  )
}

export function Carte({ titre, children, className = '' }) {
  return (
    <section className={`p-5 rounded-3xl bg-bg-elevated shadow-soft flex flex-col gap-4 ${className}`}>
      {titre && <h2 className="font-sans text-lg font-semibold text-text-primary">{titre}</h2>}
      {children}
    </section>
  )
}

const STYLES_BOUTON = {
  principal: 'bg-accent text-white font-medium hover:opacity-90',
  secondaire: 'border border-separator bg-bg-elevated text-text-primary',
  discret: 'text-text-muted hover:text-text-primary',
}

export function Bouton({ variante = 'principal', className = '', ...props }) {
  return (
    <button
      {...props}
      className={`font-sans px-6 py-3 rounded-full transition-all duration-200 ease-spring active:scale-95 disabled:opacity-40 ${STYLES_BOUTON[variante]} ${className}`}
    />
  )
}

export function ChampTexte({ label, id, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="font-sans text-sm text-text-muted px-1">
          {label}
        </label>
      )}
      <input
        id={id}
        {...props}
        className="font-sans w-full px-4 py-3 rounded-2xl border border-separator bg-bg-base text-text-primary transition-colors duration-200 ease-spring focus:outline-none focus:border-accent"
      />
    </div>
  )
}

// Interrupteur façon iOS (role="switch"), libellé et détail facultatif.
// La zone tactile fait au moins 44 pt (cible-44).
export function Interrupteur({ label, detail, actif, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="font-sans text-sm text-text-primary">{label}</span>
        {detail && <span className="font-sans text-xs text-text-muted">{detail}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={actif}
        aria-label={label}
        onClick={() => onChange(!actif)}
        className={`cible-44 w-12 h-7 shrink-0 rounded-full transition-colors duration-200 ease-spring ${
          actif ? 'bg-accent' : 'bg-interrupteur-off'
        }`}
      >
        <span
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-soft transition-all duration-200 ease-spring ${
            actif ? 'left-5.5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

// État d'erreur d'un écran dont les données n'ont pas pu être chargées :
// message et « Réessayer », à la place du contenu (et de formulaires qui
// échoueraient de toute façon)
export function EtatErreur({ message }) {
  return (
    <section role="alert" className="p-5 rounded-3xl bg-bg-elevated shadow-soft flex flex-col gap-3">
      <p className="text-3xl" aria-hidden="true">
        ⚠️
      </p>
      <p className="font-sans text-text-primary">{message}</p>
      <Bouton variante="secondaire" onClick={() => window.location.reload()}>
        Réessayer
      </Bouton>
    </section>
  )
}
