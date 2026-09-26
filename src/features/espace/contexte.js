import { createContext, useContext } from 'react'

export const EspaceContexte = createContext(null)

// { espaces, espace, profil, chargement, choisirEspace, recharger }
// `espace` = espace courant ({ id, nom, role }), null tant qu'aucun n'existe
export function useEspace() {
  return useContext(EspaceContexte)
}

// Accepte un code brut ou un lien complet .../rejoindre/<code>
export function extraireCodeInvitation(saisie) {
  const nettoye = saisie.trim().replace(/\/+$/, '')
  return nettoye.split('/').pop()
}
