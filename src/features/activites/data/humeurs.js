// Set d'humeurs partagé entre l'écran d'accueil (mood du jour) et le
// carnet (mood de fin d'activité), pour garder les mêmes emoji partout.
export const HUMEURS = [
  { valeur: 'content', emoji: '😊', label: 'Content·e' },
  { valeur: 'neutre', emoji: '😐', label: 'Neutre' },
  { valeur: 'triste', emoji: '😢', label: 'Triste' },
  { valeur: 'enerve', emoji: '😡', label: 'Énervé·e' },
]

export function emojiHumeur(valeur) {
  return HUMEURS.find((h) => h.valeur === valeur)?.emoji ?? null
}
