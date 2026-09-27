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
  const [code, setCode] = useState('')
  const [verification, setVerification] = useState(false)
  const [renvoye, setRenvoye] = useState(false)
  const [erreur, setErreur] = useState('')

  if (chargement) return <Chargement plein />
  if (utilisateur) return <Navigate to={redirection} replace />

  // Le lien magique et Google ramènent directement sur la page demandée
  // (ex. /rejoindre/<code>) : l'URL doit être autorisée dans Supabase >
  // Authentication > URL Configuration > Redirect URLs.
  const urlRetour = window.location.origin + redirection

  // Un seul email contient le code à 6 chiffres et le lien : le code se tape
  // ici, ce qui marche aussi dans Nido installé sur l'écran d'accueil (où le
  // lien, lui, s'ouvre dans Safari)
  async function envoyerLien(e) {
    e?.preventDefault()
    setErreur('')
    setEnvoiEnCours(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: urlRetour },
    })
    setEnvoiEnCours(false)
    if (error) {
      setErreur(
        error.status === 429
          ? 'Trop de demandes pour le moment : attends quelques minutes avant de redemander un code.'
          : "Impossible d'envoyer le code. Vérifie l'adresse et réessaie."
      )
      return false
    }
    setLienEnvoye(true)
    return true
  }

  async function verifierCode(e) {
    e.preventDefault()
    setErreur('')
    setVerification(true)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' })
    setVerification(false)
    // En cas de succès, la session arrive par AuthProvider et on est redirigé
    if (error) setErreur('Ce code est incorrect ou a expiré. Vérifie-le, ou demande un nouveau code.')
  }

  async function renvoyer() {
    setRenvoye(false)
    setCode('')
    if (await envoyerLien()) setRenvoye(true)
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
          <div className="w-full p-6 rounded-3xl bg-bg-elevated shadow-soft flex flex-col gap-4">
            <p className="text-3xl" aria-hidden="true">
              📬
            </p>
            <p className="font-sans text-text-primary font-medium">Code envoyé !</p>
            <p className="font-sans text-sm text-text-secondary">
              Tape le code reçu par email à <strong>{email.trim()}</strong>.
            </p>
            <form onSubmit={verifierCode} className="flex flex-col gap-3">
              <label htmlFor="code" className="sr-only">
                Code de connexion
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                maxLength={10}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="font-sans w-full px-4 py-3 rounded-2xl border border-separator bg-bg-base text-text-primary text-center text-2xl tracking-[0.3em] tabular-nums focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={verification || code.length < 6}
                className="font-sans w-full px-6 py-3 rounded-full bg-accent text-white font-medium transition-all duration-200 ease-spring hover:opacity-90 active:scale-95 disabled:opacity-40"
              >
                {verification ? 'Vérification…' : 'Me connecter'}
              </button>
            </form>
            <p className="font-sans text-xs text-text-muted">
              Tu peux aussi toucher le lien de l'email. Rien reçu ? Regarde dans les spams.
            </p>
            {renvoye && (
              <p role="status" className="font-sans text-sm text-text-secondary">
                Nouveau code envoyé ✓
              </p>
            )}
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={renvoyer}
                disabled={envoiEnCours}
                className="cible-44 font-sans text-sm text-accent-text underline disabled:opacity-40"
              >
                Renvoyer un code
              </button>
              <button
                type="button"
                onClick={() => {
                  setLienEnvoye(false)
                  setCode('')
                  setErreur('')
                  setRenvoye(false)
                }}
                className="cible-44 font-sans text-sm text-text-muted underline"
              >
                Autre adresse
              </button>
            </div>
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
                {envoiEnCours ? 'Envoi…' : 'Recevoir un code de connexion'}
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

        {erreur && (
          <p role="status" className="font-sans text-sm text-text-primary">
            {erreur}
          </p>
        )}
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
