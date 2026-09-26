import { createContext, useContext } from 'react'

export const CoffreContexte = createContext(null)

// Voir CoffreProvider pour le détail des valeurs exposées
export function useCoffre() {
  return useContext(CoffreContexte)
}

export const CATEGORIES = [
  { valeur: 'maison', label: 'Maison', emoji: '🏠' },
  { valeur: 'wifi', label: 'Wi-Fi & box', emoji: '📶' },
  { valeur: 'banque', label: 'Banque', emoji: '🏦' },
  { valeur: 'admin', label: 'Administratif', emoji: '🗂️' },
  { valeur: 'sante', label: 'Santé', emoji: '🩺' },
  { valeur: 'streaming', label: 'Streaming', emoji: '📺' },
  { valeur: 'courses', label: 'Courses & livraison', emoji: '🛒' },
  { valeur: 'voyage', label: 'Voyage', emoji: '✈️' },
  { valeur: 'autre', label: 'Autre', emoji: '🔑' },
]

export function categorie(valeur) {
  return CATEGORIES.find((c) => c.valeur === valeur) ?? CATEGORIES[CATEGORIES.length - 1]
}
