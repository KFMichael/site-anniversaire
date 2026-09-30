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

// Rayon deviné depuis le nom saisi (« 2 bananes » → fruits & légumes), pour
// ne pas avoir à le choisir ; 'autre' si rien ne correspond
const MOTS_RAYONS = [
  ['fruits-legumes', ['pomme', 'banane', 'citron', 'orange', 'tomate', 'salade', 'oignon', 'ail', 'carotte', 'courgette', 'poireau', 'avocat', 'fraise', 'raisin', 'poivron', 'concombre', 'champignon', 'piment', 'gingembre', 'herbe', 'persil', 'coriandre', 'basilic', 'legume', 'fruit', 'aubergine', 'epinard', 'brocoli', 'kiwi', 'mangue', 'ananas', 'plantain', 'patate', 'pomme de terre']],
  ['boulangerie', ['pain', 'baguette', 'croissant', 'brioche', 'viennoiserie']],
  ['frais', ['lait', 'beurre', 'oeuf', 'yaourt', 'fromage', 'creme', 'jambon', 'lardon', 'mozzarella', 'emmental', 'parmesan', 'feta', 'skyr', 'compote', 'tofu']],
  ['boucherie', ['poulet', 'boeuf', 'viande', 'steak', 'porc', 'agneau', 'dinde', 'saucisse', 'poisson', 'saumon', 'thon frais', 'crevette', 'cabillaud', 'merguez']],
  ['epicerie', ['pate', 'riz', 'farine', 'sucre', 'huile', 'sel', 'poivre', 'cafe', 'the', 'cereale', 'conserve', 'thon', 'sauce', 'epice', 'moutarde', 'vinaigre', 'chocolat', 'biscuit', 'miel', 'confiture', 'lentille', 'haricot', 'semoule', 'couscous', 'attieke', 'cube', 'bouillon', 'chips', 'gateau']],
  ['surgeles', ['surgele', 'glace', 'frite']],
  ['boissons', ['eau', 'jus', 'soda', 'coca', 'biere', 'vin', 'sirop', 'boisson', 'limonade']],
  ['hygiene', ['papier toilette', 'dentifrice', 'gel douche', 'shampoing', 'savon', 'deodorant', 'brosse a dent', 'coton', 'rasoir', 'couche', 'mouchoir', 'serviette hygienique', 'tampon']],
  ['entretien', ['lessive', 'liquide vaisselle', 'eponge', 'sac poubelle', 'essuie tout', 'javel', 'nettoyant', 'adoucissant', 'pastille lave vaisselle', 'produit vaisselle', 'sopalin']],
]

function normaliserMot(texte) {
  return ` ${(texte ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `
}

export function devinerRayon(nom) {
  const texte = normaliserMot(nom)
  if (texte.trim() === '') return 'autre'
  // Expressions longues d'abord (« papier toilette » avant « papier »),
  // pluriels simples acceptés (« bananes », « œufs »)
  const candidats = MOTS_RAYONS.flatMap(([id, mots]) => mots.map((m) => [id, m])).sort((a, b) => b[1].length - a[1].length)
  const trouve = candidats.find(([, m]) => texte.includes(` ${m} `) || texte.includes(` ${m}s `) || texte.includes(` ${m}x `))
  return trouve ? trouve[0] : 'autre'
}
