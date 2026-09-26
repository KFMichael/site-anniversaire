import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { AuthContexte } from './contexte'

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    // getSession lit aussi le jeton présent dans l'URL au retour du lien
    // magique ou de Google (detectSessionInUrl, activé par défaut)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChargement(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_evenement, nouvelleSession) => {
      setSession(nouvelleSession)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const valeur = useMemo(
    () => ({
      session,
      utilisateur: session?.user ?? null,
      chargement,
      deconnexion: () => supabase.auth.signOut(),
    }),
    [session, chargement]
  )

  return <AuthContexte.Provider value={valeur}>{children}</AuthContexte.Provider>
}
