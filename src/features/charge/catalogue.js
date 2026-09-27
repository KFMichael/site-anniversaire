// Catalogue de charges courantes, par thème, proposé dans « Gérer les
// charges » (poids : 1 léger, 2 moyen, 3 lourd). Logique pure, testée par
// catalogue.test.js.

export const CATALOGUE = [
  {
    theme: 'Maison',
    charges: [
      { nom: 'Faire le ménage', emoji: '🧽', poids: 2 },
      { nom: 'Faire la lessive', emoji: '🧺', poids: 2 },
      { nom: 'Étendre et plier le linge', emoji: '👕', poids: 1 },
      { nom: 'Repasser', emoji: '🧼', poids: 1 },
      { nom: 'Changer les draps', emoji: '🛏️', poids: 1 },
      { nom: 'Sortir les poubelles', emoji: '🗑️', poids: 1 },
      { nom: 'Faire la vaisselle', emoji: '🍽️', poids: 1 },
      { nom: 'Arroser les plantes', emoji: '🪴', poids: 1 },
      { nom: 'Petits travaux et bricolage', emoji: '🔧', poids: 2 },
      { nom: 'Gérer la femme de ménage', emoji: '🧹', poids: 1 },
    ],
  },
  {
    theme: 'Courses et repas',
    charges: [
      { nom: 'Faire la liste des courses', emoji: '📝', poids: 1 },
      { nom: 'Aller faire les courses', emoji: '🛒', poids: 2 },
      { nom: 'Faire le menu de la semaine', emoji: '📋', poids: 2 },
      { nom: 'Cuisiner le soir', emoji: '👩🏾‍🍳', poids: 3 },
      { nom: 'Préparer les repas du midi', emoji: '🥡', poids: 2 },
    ],
  },
  {
    theme: 'Argent et papiers',
    charges: [
      { nom: 'Gérer les finances', emoji: '💶', poids: 3 },
      { nom: 'Payer les factures', emoji: '🧾', poids: 1 },
      { nom: 'Suivre le budget', emoji: '📊', poids: 2 },
      { nom: 'Gérer les papiers administratifs', emoji: '🗂️', poids: 2 },
      { nom: 'Déclarer les impôts', emoji: '🏛️', poids: 2 },
      { nom: 'Gérer les assurances et contrats', emoji: '🛡️', poids: 1 },
    ],
  },
  {
    theme: 'Santé',
    charges: [
      { nom: 'Prendre les rendez-vous médicaux', emoji: '🩺', poids: 1 },
      { nom: 'Gérer la pharmacie', emoji: '💊', poids: 1 },
      { nom: 'Prévoir les séances de sport', emoji: '🏃', poids: 1 },
    ],
  },
  {
    theme: 'Enfants et animaux',
    charges: [
      { nom: "Gérer l'école et la crèche", emoji: '🎒', poids: 3 },
      { nom: 'Emmener et récupérer les enfants', emoji: '🚸', poids: 2 },
      { nom: 'Organiser les activités des enfants', emoji: '⚽', poids: 2 },
      { nom: 'Trouver une baby-sitter', emoji: '🍼', poids: 1 },
      { nom: "S'occuper de l'animal", emoji: '🐾', poids: 2 },
    ],
  },
  {
    theme: 'Vie sociale et sorties',
    charges: [
      { nom: 'Trouver les activités à faire', emoji: '🎈', poids: 1 },
      { nom: 'Organiser les vacances', emoji: '✈️', poids: 3 },
      { nom: 'Penser aux anniversaires et cadeaux', emoji: '🎁', poids: 2 },
      { nom: 'Garder le lien avec la famille', emoji: '📞', poids: 1 },
      { nom: 'Recevoir des invités', emoji: '🥂', poids: 2 },
    ],
  },
  {
    theme: 'Véhicule',
    charges: [
      { nom: "Entretenir la voiture", emoji: '🚗', poids: 1 },
      { nom: 'Faire le plein', emoji: '⛽', poids: 1 },
    ],
  },
]

function normaliser(texte) {
  return (texte ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Le catalogue avec l'état de chaque charge dans l'espace :
// 'active' (déjà là), 'archivee' (à réactiver) ou 'libre' (à ajouter)
export function catalogueAvecEtat(existantes) {
  const parNom = new Map(existantes.map((c) => [normaliser(c.nom), c]))
  return CATALOGUE.map(({ theme, charges }) => ({
    theme,
    charges: charges.map((c) => {
      const existante = parNom.get(normaliser(c.nom))
      return {
        ...c,
        etat: !existante ? 'libre' : existante.archivee ? 'archivee' : 'active',
        id: existante?.id ?? null,
      }
    }),
  }))
}
