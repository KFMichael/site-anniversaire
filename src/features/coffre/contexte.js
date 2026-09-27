import { createContext, useContext } from 'react'

export const CoffreContexte = createContext(null)

// Voir CoffreProvider pour le détail des valeurs exposées
export function useCoffre() {
  return useContext(CoffreContexte)
}

export { CATEGORIES, categorie } from './categories'
