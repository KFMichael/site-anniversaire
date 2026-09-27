// Nom provisoire de l'application : utilisé dans l'interface, le titre de
// l'onglet et (plus tard) les emails de récap.
export const NOM_APP = 'Nido'

// Modules de l'espace, dans l'ordre d'affichage du tableau de bord.
// `route` absent = module pas encore développé (carte « Bientôt »).
export const MODULES = [
  {
    id: 'charge',
    titre: 'Charge mentale',
    description: 'Qui gère quoi ce mois-ci',
    emoji: '🧠',
    route: '/charge',
  },
  {
    id: 'courses',
    titre: 'Courses',
    description: 'Le stock de la maison et la liste à acheter',
    emoji: '🛒',
    route: '/courses',
  },
  {
    id: 'menus',
    titre: 'Menus',
    description: 'Les dîners de la semaine',
    emoji: '🍽️',
    route: '/menus',
  },
  {
    id: 'sport',
    titre: 'Sport',
    description: '3 séances de 45 min ensemble',
    emoji: '🏃',
    route: '/sport',
  },
  {
    id: 'echeances',
    titre: 'Échéances',
    description: 'Impôts, assurances… avec rappels',
    emoji: '📅',
    route: '/echeances',
  },
  {
    id: 'listes',
    titre: 'Listes',
    description: 'Films à voir, choses à faire',
    emoji: '📝',
    route: '/listes',
  },
  {
    id: 'activites',
    titre: 'Activités',
    description: 'Idées de sorties, carnet, voyages',
    emoji: '🎈',
    route: '/activites',
  },
  {
    id: 'coffre',
    titre: 'Mots de passe',
    description: 'Le coffre-fort partagé',
    emoji: '🔐',
    route: '/coffre',
  },
]
