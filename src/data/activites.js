// Grille du quiz : axe 1 = actif/calme, axe 2 = créatif/passif
// Chaque case contient les activités proposées, issues de la session de brainstorming

export const activites = {
  actif_creatif: [
    'Poterie (version active)',
    'Atelier peinture',
    'Acrobranche',
    'Cours de danse en duo',
    'Escape game physique',
    'Kayak / paddle',
    'Via ferrata',
    'Sortie vélo découverte',
    'Marche / rando',
  ],
  actif_passif: [
    'Karting',
    'Bowling',
    'Escape game',
    'Laser game',
    'Patinoire',
    'Escalade',
    'Rafting',
    'Saut en parachute',
    'Karaoké',
  ],
  calme_creatif: [
    'Poterie',
    'Atelier peinture',
    'Atelier cuisine',
    'Cours de mixologie',
    'Atelier photo',
    'DIY (bougies, parfum)',
    'Jardinage',
    'Soirée jeux de société en duo',
    'Cours de cuisine à deux (à la maison)',
  ],
  calme_passif: [
    'Spa / sauna',
    'Brunch',
    'Restaurant (dont étoilé)',
    'Cinéma',
    'Dégustation (vin, chocolat, whisky)',
    'Massage',
    'Croisière fluviale',
    'Planétarium',
    'Exposition / musée',
    "Dîner aux chandelles à la maison",
    "Nuit d'hôtel (staycation)",
    'Petit-déjeuner au lit',
    'Séance ciné privée à la maison',
  ],
}

// Les 2 questions du quiz, ton sobre-élégant avec une pointe de fun
export const questions = [
  {
    id: 'axe1',
    texte: 'Envie de faire chauffer les muscles, ou de laisser le temps filer ?',
    reponses: [
      { label: 'Faire chauffer les muscles', valeur: 'actif' },
      { label: 'Laisser le temps filer', valeur: 'calme' },
    ],
  },
  {
    id: 'axe2',
    texte: 'Tu préfères créer quelque chose de tes mains, ou te laisser porter ?',
    reponses: [
      { label: 'Créer de mes mains', valeur: 'creatif' },
      { label: 'Me laisser porter', valeur: 'passif' },
    ],
  },
]

// Combine les 2 réponses pour retrouver la bonne case de la grille,
// puis tire une seule activité au hasard dans cette case
export function getActiviteSuggeree(reponseAxe1, reponseAxe2) {
  const cle = `${reponseAxe1}_${reponseAxe2}`
  const liste = activites[cle] || []
  if (liste.length === 0) return null
  const index = Math.floor(Math.random() * liste.length)
  return liste[index]
}