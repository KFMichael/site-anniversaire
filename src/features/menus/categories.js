export const CATEGORIES_PLATS = [
  { id: 'pates', label: 'Pâtes', emoji: '🍝' },
  { id: 'viande', label: 'Viande', emoji: '🍗' },
  { id: 'poisson', label: 'Poisson', emoji: '🐟' },
  { id: 'vegetarien', label: 'Végétarien', emoji: '🥗' },
  { id: 'oeufs', label: 'Œufs', emoji: '🍳' },
  { id: 'sauce', label: 'Sauces', emoji: '🥘' },
  { id: 'soupe', label: 'Soupe', emoji: '🍲' },
  { id: 'autre', label: 'Autre', emoji: '🍽️' },
]

export function categoriePlat(id) {
  return CATEGORIES_PLATS.find((c) => c.id === id) ?? CATEGORIES_PLATS[CATEGORIES_PLATS.length - 1]
}
