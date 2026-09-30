// Geste « glisser depuis le bord gauche pour revenir » : sur iPhone, une
// appli installée sur l'écran d'accueil n'a pas le geste de Safari. Logique
// pure (seuils), testée par geste-retour.test.js ; le hook est dans
// useGesteRetour.js.

// Le geste doit commencer tout contre le bord gauche
export const BORD = 24

// Sens du geste une fois le doigt parti : null tant qu'il a bougé de moins
// de 8 px, sinon 'horizontal' ou 'vertical' (défilement : on abandonne)
export function sensDuGeste(dx, dy) {
  if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return null
  return Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
}

// Assez glissé pour revenir : un tiers de l'écran, 100 px au plus
export function gesteReussi(dx, largeurEcran) {
  return dx >= Math.min(100, largeurEcran / 3)
}
