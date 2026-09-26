import { createContext, useContext } from 'react'

export const AuthContexte = createContext(null)

// { session, utilisateur, chargement, deconnexion }
export function useAuth() {
  return useContext(AuthContexte)
}

// N'accepte que les chemins internes ("/...", pas "//autre-site.com")
// pour ne pas transformer ?redirection= en redirection ouverte.
export function redirectionSure(chemin) {
  return typeof chemin === 'string' && chemin.startsWith('/') && !chemin.startsWith('//')
    ? chemin
    : '/'
}
