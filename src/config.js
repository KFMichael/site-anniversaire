// Nom provisoire de l'application : utilisé dans l'interface, le titre de
// l'onglet et (plus tard) les emails de récap.
export const NOM_APP = 'Nido'

// Modules rangés dans l'onglet « Plus », par groupe (Courses, Menus et
// Charge mentale ont leur propre onglet). `route` absent = pas encore
// développé.
export const MODULES = [
  { id: 'finances', groupe: 'Organisation', titre: 'Finances', description: 'Où part notre argent, poste par poste', emoji: '💶', route: '/finances' },
  { id: 'echeances', groupe: 'Organisation', titre: 'Échéances', description: 'Impôts, assurances… avec rappels', emoji: '📅', route: '/echeances' },
  { id: 'listes', groupe: 'Organisation', titre: 'Listes', description: 'Films à voir, choses à faire', emoji: '📝', route: '/listes' },
  { id: 'sport', groupe: 'Ensemble', titre: 'Sport', description: '3 séances de 45 min ensemble', emoji: '🏃', route: '/sport' },
  { id: 'activites', groupe: 'Ensemble', titre: 'Activités', description: 'Idées de sorties, carnet, voyages', emoji: '🎈', route: '/activites' },
  { id: 'coffre', groupe: 'Sécurité', titre: 'Mots de passe', description: 'Le coffre-fort partagé', emoji: '🔐', route: '/coffre' },
]
