// Rayons, dans l'ordre d'un parcours de supermarché classique
export const RAYONS = [
  { id: 'fruits-legumes', label: 'Fruits & légumes', emoji: '🥕' },
  { id: 'boulangerie', label: 'Boulangerie', emoji: '🥖' },
  { id: 'frais', label: 'Frais', emoji: '🧀' },
  { id: 'boucherie', label: 'Boucherie & poisson', emoji: '🥩' },
  { id: 'epicerie', label: 'Épicerie', emoji: '🥫' },
  { id: 'surgeles', label: 'Surgelés', emoji: '🧊' },
  { id: 'boissons', label: 'Boissons', emoji: '🧃' },
  { id: 'hygiene', label: 'Hygiène', emoji: '🧴' },
  { id: 'entretien', label: 'Entretien', emoji: '🧽' },
  { id: 'autre', label: 'Autre', emoji: '🛍️' },
]

export function rayon(id) {
  return RAYONS.find((r) => r.id === id) ?? RAYONS[RAYONS.length - 1]
}

// Couleurs d'état (décoratives : le libellé est toujours affiché)
export const COULEURS_ETAT = { ok: '#34C759', bientot: '#FF9500', fini: '#FF3B30' }

export const ETATS = [
  { id: 'ok', label: 'Il en reste', court: 'OK' },
  { id: 'bientot', label: 'Presque fini', court: 'Bientôt' },
  { id: 'fini', label: 'Fini', court: 'Fini' },
]
