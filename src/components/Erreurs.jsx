import { Component, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'

function EcranErreur({ emoji, titre, texte, children }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-bg-base">
      <div className="max-w-sm w-full p-8 rounded-3xl bg-bg-elevated shadow-soft flex flex-col items-center gap-4 text-center">
        <span className="text-5xl" aria-hidden="true">
          {emoji}
        </span>
        <h1 className="font-sans text-2xl font-bold text-text-primary">{titre}</h1>
        <p className="font-sans text-text-secondary">{texte}</p>
        {children}
      </div>
    </main>
  )
}

const CLASSES_BOUTON =
  'font-sans px-6 py-3 rounded-full bg-accent text-white font-medium transition-all duration-200 ease-spring active:scale-95'

// 404 : adresse inconnue (lien ancien, faute de frappe…)
export function PageIntrouvable() {
  return (
    <EcranErreur emoji="🧭" titre="Page introuvable" texte="Cette adresse ne mène nulle part dans Nido.">
      <Link to="/" className={CLASSES_BOUTON}>
        Retour à l'accueil
      </Link>
    </EcranErreur>
  )
}

// Après un déploiement, un onglet resté ouvert réclame d'anciens fichiers
// qui n'existent plus : il suffit de recharger pour obtenir la nouvelle version
function estNouvelleVersion(erreur) {
  return /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
    erreur?.message ?? ''
  )
}

// Limite d'erreur : un écran qui plante affiche ceci au lieu d'une page blanche
export class LimiteErreur extends Component {
  state = { erreur: null }

  static getDerivedStateFromError(erreur) {
    return { erreur }
  }

  componentDidCatch(erreur, info) {
    console.error('Erreur d’affichage', erreur, info.componentStack)
  }

  render() {
    const { erreur } = this.state
    if (!erreur) return this.props.children

    if (estNouvelleVersion(erreur)) {
      return (
        <EcranErreur emoji="✨" titre="Nouvelle version" texte="Nido a été mis à jour. Recharge la page pour continuer.">
          <button className={CLASSES_BOUTON} onClick={() => window.location.reload()}>
            Recharger
          </button>
        </EcranErreur>
      )
    }
    return (
      <EcranErreur
        emoji="😵"
        titre="Oups, un souci"
        texte="Quelque chose s'est mal passé sur cet écran. Tes données sont en sécurité."
      >
        <button className={CLASSES_BOUTON} onClick={() => window.location.reload()}>
          Recharger
        </button>
        <a href="/" className="font-sans text-sm text-text-muted underline py-2">
          Retour à l'accueil
        </a>
      </EcranErreur>
    )
  }
}

function sAbonnerConnexion(rappel) {
  window.addEventListener('online', rappel)
  window.addEventListener('offline', rappel)
  return () => {
    window.removeEventListener('online', rappel)
    window.removeEventListener('offline', rappel)
  }
}

// Bandeau discret quand l'appareil perd la connexion
export function BandeauHorsConnexion() {
  const enLigne = useSyncExternalStore(
    sAbonnerConnexion,
    () => navigator.onLine,
    () => true
  )
  if (enLigne) return null
  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-50 pt-[env(safe-area-inset-top)] bg-text-primary text-bg-base"
    >
      <p className="font-sans text-sm text-center px-4 py-2">
        Hors connexion : les changements ne seront pas enregistrés.
      </p>
    </div>
  )
}
