// Système de scoring par proximité sur 5 axes, chacun noté de 0 à 1 :
// - actif       : 0 = très calme, 1 = très actif physiquement
// - creatif     : 0 = passif/consommé, 1 = créatif/participatif
// - spontane    : 0 = prévu à l'avance, 1 = spontané/impromptu
// - ambiance    : 0 = intime/tranquille, 1 = festif/social
// - spectateur  : 0 = on est acteur, 1 = on est spectateur/on vit un show
//
// Chaque activité est taguée sur ces 5 axes. Le quiz calcule la distance
// entre le profil de réponses de l'utilisateur et chaque activité, puis
// tire au sort parmi les activités les plus proches.

export const activites = [
  // --- Actif / créatif (exploration, aventure, expression physique) ---
  { nom: 'Poterie (version active)', actif: 0.6, creatif: 0.9, spontane: 0.2, ambiance: 0.2, spectateur: 0.1 },
  { nom: 'Atelier peinture', actif: 0.3, creatif: 0.9, spontane: 0.3, ambiance: 0.3, spectateur: 0.1 },
  { nom: 'Acrobranche', actif: 0.8, creatif: 0.4, spontane: 0.4, ambiance: 0.4, spectateur: 0.1 },
  { nom: 'Cours de danse en duo', actif: 0.7, creatif: 0.8, spontane: 0.2, ambiance: 0.5, spectateur: 0.1 },
  { nom: 'Escape game physique', actif: 0.6, creatif: 0.7, spontane: 0.3, ambiance: 0.4, spectateur: 0.1 },
  { nom: 'Kayak / paddle', actif: 0.8, creatif: 0.3, spontane: 0.4, ambiance: 0.3, spectateur: 0.1 },
  { nom: 'Via ferrata', actif: 0.9, creatif: 0.3, spontane: 0.2, ambiance: 0.3, spectateur: 0.1 },
  { nom: 'Sortie vélo découverte', actif: 0.7, creatif: 0.3, spontane: 0.5, ambiance: 0.3, spectateur: 0.1 },
  { nom: 'Marche / rando', actif: 0.6, creatif: 0.2, spontane: 0.5, ambiance: 0.2, spectateur: 0.1 },
  { nom: 'Balade à vélo façon gamins, sans but précis', actif: 0.6, creatif: 0.4, spontane: 0.9, ambiance: 0.3, spectateur: 0.1 },
  { nom: 'Colin-maillard / cache-cache version adulte', actif: 0.7, creatif: 0.6, spontane: 0.8, ambiance: 0.6, spectateur: 0.1 },

  // --- Actif / passif (défoulement, sensations, jeu) ---
  { nom: 'Karting', actif: 0.7, creatif: 0.1, spontane: 0.4, ambiance: 0.5, spectateur: 0.1 },
  { nom: 'Bowling', actif: 0.5, creatif: 0.1, spontane: 0.5, ambiance: 0.6, spectateur: 0.1 },
  { nom: 'Escape game', actif: 0.4, creatif: 0.3, spontane: 0.3, ambiance: 0.4, spectateur: 0.1 },
  { nom: 'Laser game', actif: 0.7, creatif: 0.1, spontane: 0.5, ambiance: 0.6, spectateur: 0.1 },
  { nom: 'Patinoire', actif: 0.6, creatif: 0.1, spontane: 0.5, ambiance: 0.5, spectateur: 0.1 },
  { nom: 'Escalade', actif: 0.8, creatif: 0.2, spontane: 0.3, ambiance: 0.3, spectateur: 0.1 },
  { nom: 'Rafting', actif: 0.9, creatif: 0.1, spontane: 0.2, ambiance: 0.5, spectateur: 0.1 },
  { nom: 'Saut en parachute', actif: 0.9, creatif: 0.1, spontane: 0.1, ambiance: 0.4, spectateur: 0.1 },
  { nom: 'Karaoké', actif: 0.5, creatif: 0.6, spontane: 0.5, ambiance: 0.8, spectateur: 0.2 },

  // --- Calme / créatif (fabriquer, apprendre, cultiver à deux) ---
  { nom: 'Poterie', actif: 0.2, creatif: 0.9, spontane: 0.2, ambiance: 0.2, spectateur: 0.1 },
  { nom: 'Atelier cuisine', actif: 0.3, creatif: 0.8, spontane: 0.3, ambiance: 0.3, spectateur: 0.1 },
  { nom: 'Cours de mixologie', actif: 0.3, creatif: 0.7, spontane: 0.3, ambiance: 0.5, spectateur: 0.1 },
  { nom: 'Atelier photo', actif: 0.3, creatif: 0.8, spontane: 0.4, ambiance: 0.3, spectateur: 0.1 },
  { nom: 'DIY (bougies, parfum)', actif: 0.2, creatif: 0.9, spontane: 0.2, ambiance: 0.2, spectateur: 0.1 },
  { nom: 'Jardinage', actif: 0.3, creatif: 0.6, spontane: 0.2, ambiance: 0.1, spectateur: 0.1 },
  { nom: 'Soirée jeux de société en duo', actif: 0.1, creatif: 0.6, spontane: 0.4, ambiance: 0.3, spectateur: 0.1 },
  { nom: 'Cours de cuisine à deux (à la maison)', actif: 0.2, creatif: 0.8, spontane: 0.4, ambiance: 0.2, spectateur: 0.1 },
  { nom: 'Puzzle à deux', actif: 0.1, creatif: 0.5, spontane: 0.3, ambiance: 0.1, spectateur: 0.1 },
  { nom: 'Tournoi de jeux vidéo rétro', actif: 0.2, creatif: 0.5, spontane: 0.5, ambiance: 0.3, spectateur: 0.1 },
  { nom: 'Après-midi Monopoly / Uno / cartes', actif: 0.1, creatif: 0.5, spontane: 0.5, ambiance: 0.3, spectateur: 0.1 },
  { nom: 'Atelier pâtisserie (crêpes, gâteau)', actif: 0.2, creatif: 0.8, spontane: 0.5, ambiance: 0.2, spectateur: 0.1 },
  { nom: 'Crêpes party maison', actif: 0.2, creatif: 0.7, spontane: 0.6, ambiance: 0.4, spectateur: 0.1 },

  // --- Calme / passif (détente, plaisir sensoriel, contemplation) ---
  { nom: 'Spa / sauna', actif: 0.1, creatif: 0.1, spontane: 0.2, ambiance: 0.1, spectateur: 0.1 },
  { nom: 'Brunch', actif: 0.1, creatif: 0.1, spontane: 0.5, ambiance: 0.4, spectateur: 0.1 },
  { nom: 'Restaurant (dont étoilé)', actif: 0.1, creatif: 0.1, spontane: 0.2, ambiance: 0.4, spectateur: 0.1 },
  { nom: 'Cinéma', actif: 0.1, creatif: 0.1, spontane: 0.4, ambiance: 0.3, spectateur: 0.7 },
  { nom: 'Dégustation (vin, chocolat, whisky)', actif: 0.1, creatif: 0.2, spontane: 0.3, ambiance: 0.4, spectateur: 0.1 },
  { nom: 'Massage', actif: 0.1, creatif: 0.1, spontane: 0.2, ambiance: 0.1, spectateur: 0.1 },
  { nom: 'Croisière fluviale', actif: 0.1, creatif: 0.1, spontane: 0.2, ambiance: 0.3, spectateur: 0.3 },
  { nom: 'Planétarium', actif: 0.1, creatif: 0.2, spontane: 0.3, ambiance: 0.2, spectateur: 0.6 },
  { nom: 'Exposition / musée', actif: 0.2, creatif: 0.3, spontane: 0.4, ambiance: 0.2, spectateur: 0.4 },
  { nom: 'Dîner aux chandelles à la maison', actif: 0.1, creatif: 0.3, spontane: 0.2, ambiance: 0.1, spectateur: 0.1 },
  { nom: "Nuit d'hôtel (staycation)", actif: 0.1, creatif: 0.1, spontane: 0.3, ambiance: 0.2, spectateur: 0.1 },
  { nom: 'Petit-déjeuner au lit', actif: 0.1, creatif: 0.2, spontane: 0.4, ambiance: 0.1, spectateur: 0.1 },
  { nom: 'Séance ciné privée à la maison', actif: 0.1, creatif: 0.2, spontane: 0.5, ambiance: 0.1, spectateur: 0.6 },
  { nom: 'Glace impromptue', actif: 0.2, creatif: 0.1, spontane: 0.9, ambiance: 0.3, spectateur: 0.1 },
  { nom: 'Tour des meilleures pâtisseries du coin', actif: 0.3, creatif: 0.2, spontane: 0.7, ambiance: 0.4, spectateur: 0.1 },

  // --- Spectateur énergique (nouveau territoire) ---
  { nom: 'Match de foot au stade', actif: 0.3, creatif: 0.1, spontane: 0.3, ambiance: 0.9, spectateur: 0.9 },
  { nom: 'Concert / festival', actif: 0.4, creatif: 0.2, spontane: 0.4, ambiance: 0.9, spectateur: 0.9 },
  { nom: 'Match d\u2019un autre sport en tribune', actif: 0.3, creatif: 0.1, spontane: 0.3, ambiance: 0.8, spectateur: 0.9 },
  { nom: 'Spectacle d\u2019humour / stand-up', actif: 0.1, creatif: 0.1, spontane: 0.4, ambiance: 0.6, spectateur: 0.8 },
  { nom: 'Théâtre / comédie musicale', actif: 0.1, creatif: 0.2, spontane: 0.2, ambiance: 0.5, spectateur: 0.8 },
]

// Les 5 questions du quiz, formulées de façon imagée plutôt que littérale,
// dans le ton sobre-élégant avec une pointe de fun du site
export const questions = [
  {
    id: 'actif',
    texte: 'Envie de faire chauffer les muscles, ou de laisser le temps filer ?',
    reponses: [
      { label: 'Faire chauffer les muscles', valeur: 1 },
      { label: 'Laisser le temps filer', valeur: 0 },
    ],
  },
  {
    id: 'creatif',
    texte: 'Tu préfères créer quelque chose de tes mains, ou te laisser porter ?',
    reponses: [
      { label: 'Créer de mes mains', valeur: 1 },
      { label: 'Me laisser porter', valeur: 0 },
    ],
  },
  {
    id: 'spontane',
    texte: 'On improvise un plan sur un coup de tête, ou on prépare tout à l\u2019avance ?',
    reponses: [
      { label: 'On improvise', valeur: 1 },
      { label: 'On prépare tout', valeur: 0 },
    ],
  },
  {
    id: 'ambiance',
    texte: 'Tu rêves d\u2019un endroit qui vibre, ou d\u2019une bulle rien qu\u2019à nous ?',
    reponses: [
      { label: 'Un endroit qui vibre', valeur: 1 },
      { label: 'Une bulle à nous', valeur: 0 },
    ],
  },
  {
    id: 'spectateur',
    texte: 'Tu veux être au cœur de l\u2019action, ou vibrer avec la foule ?',
    reponses: [
      { label: 'Au cœur de l\u2019action', valeur: 0 },
      { label: 'Vibrer avec la foule', valeur: 1 },
    ],
  },
]

const AXES = ['actif', 'creatif', 'spontane', 'ambiance', 'spectateur']

// Calcule une distance euclidienne entre le profil de réponses de
// l'utilisateur et le profil d'une activité (plus c'est petit, plus
// c'est proche)
function distance(reponses, activite) {
  let somme = 0
  for (const axe of AXES) {
    const diff = (reponses[axe] ?? 0.5) - activite[axe]
    somme += diff * diff
  }
  return Math.sqrt(somme)
}

// Détermine les activités les plus proches du profil de réponses,
// exclut celles données dans exclusions (activités récentes), puis
// tire une activité au hasard parmi les meilleures correspondances
export function getActiviteSuggeree(reponses, exclusions = []) {
  let pool = activites.filter((a) => !exclusions.includes(a.nom))
  if (pool.length === 0) pool = activites // ne jamais bloquer le tirage

  const avecDistance = pool
    .map((a) => ({ activite: a, distance: distance(reponses, a) }))
    .sort((a, b) => a.distance - b.distance)

  // On tire parmi les 5 meilleures correspondances, pour garder un peu
  // de surprise plutôt que de toujours retomber sur la même
  const top = avecDistance.slice(0, Math.min(5, avecDistance.length))
  const index = Math.floor(Math.random() * top.length)
  return top[index].activite.nom
}