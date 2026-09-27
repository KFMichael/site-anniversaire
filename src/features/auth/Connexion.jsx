import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { NOM_APP } from '../../config'
import { redirectionSure, useAuth } from './contexte'
import Chargement from '../../components/Chargement'

// Connexion Google : affichée seulement une fois le fournisseur activé dans
// Supabase (sinon Supabase répond « provider is not enabled »). Voir
// docs/SUPABASE.md, puis VITE_CONNEXION_GOOGLE=true dans Vercel.
const GOOGLE_ACTIVE = import.meta.env.VITE_CONNEXION_GOOGLE === 'true'

export default function Connexion() {
  const { utilisateur, chargement } = useAuth()
  const [params] = useSearchParams()
  const redirection = redirectionSure(params.get('redirection'))

  const [email, setEmail] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [lienEnvoye, setLienEnvoye] = useState(false)
  const [erreur, setErreur] = useState('')

  if (chargement) return <Chargement plein />
  if (utilisateur) return <Navigate to={redirection} replace />

  // Le lien magique et Google ramènent directement sur la page demandée
  // (ex. /rejoindre/<code>) : l'URL doit être autorisée dans Supabase >
  // Authentication > URL Configuration > Redirect URLs.
  const urlRetour = window.location.origin + redirection

  async function envoyerLien(e) {
    e.preventDefault()
    setErreur('')
    setEnvoiEnCours(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: urlRetour },
    })
    setEnvoiEnCours(false)
    if (error) {
      setErreur("Impossible d'envoyer le lien. Vérifie l'adresse et réessaie.")
    } else {
      setLienEnvoye(true)
    }
  }

  async function connexionGoogle() {
    setErreur('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: urlRetour },
    })
    if (error) setErreur('Connexion Google indisponible pour le moment.')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-bg-base">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-sans text-5xl font-bold text-text-primary">{NOM_APP}</h1>
          <p className="font-sans text-text-muted">La vie à deux, sans rien oublier.</p>
        </div>

        {lienEnvoye ? (
          <div className="w-full p-6 rounded-3xl bg-bg-elevated shadow-soft flex flex-col gap-3">
            <p className="text-3xl">📬</p>
            <p className="font-sans text-text-primary font-medium">Lien envoyé !</p>
            <p className="font-sans text-sm text-text-secondary">
              Ouvre l'email reçu à <strong>{email.trim()}</strong> et clique sur le lien
              pour te connecter.
            </p>
            <button
              onClick={() => setLienEnvoye(false)}
              className="font-sans text-sm text-text-muted underline mt-2"
            >
              Utiliser une autre adresse
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4">
            <form onSubmit={envoyerLien} className="w-full flex flex-col gap-3">
              <label htmlFor="email" className="sr-only">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="ton@email.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-sans w-full px-4 py-3 rounded-2xl border border-separator bg-bg-elevated text-text-primary transition-colors duration-200 ease-spring focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={envoiEnCours || !email.trim()}
                className="font-sans w-full px-6 py-3 rounded-full bg-accent text-white font-medium transition-all duration-200 ease-spring hover:opacity-90 active:scale-95 disabled:opacity-40"
              >
                {envoiEnCours ? 'Envoi…' : 'Recevoir un lien de connexion'}
              </button>
            </form>

            {GOOGLE_ACTIVE && (
              <>
                <div className="flex items-center gap-3 text-text-muted text-xs font-sans">
                  <span className="flex-1 h-px bg-separator" />
                  ou
                  <span className="flex-1 h-px bg-separator" />
                </div>

                <button
                  onClick={connexionGoogle}
                  className="font-sans w-full px-6 py-3 rounded-full border border-separator bg-bg-elevated text-text-primary font-medium flex items-center justify-center gap-2 transition-all duration-200 ease-spring active:scale-95"
                >
                  <LogoGoogle />
                  Continuer avec Google
                </button>
              </>
            )}
          </div>
        )}

        {erreur && <p className="font-sans text-sm text-text-muted italic">{erreur}</p>}
      </div>
    </main>
  )
}

function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
