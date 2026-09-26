// Thème de l'interface, choisi par appareil (localStorage) :
// 'systeme' (par défaut, suit le réglage de l'appareil), 'clair' ou 'sombre'.
// Le CSS (src/index.css) lit l'attribut data-theme posé sur <html>.
// index.html applique le choix mémorisé avant le premier affichage : la
// clé et les valeurs doivent rester identiques dans son script.

export const THEMES = [
  { id: 'systeme', label: 'Système' },
  { id: 'clair', label: 'Clair' },
  { id: 'sombre', label: 'Sombre' },
]

const CLE = 'nido-theme'
const ATTRIBUT = { clair: 'light', sombre: 'dark' }
// Couleur de la barre d'état du navigateur / de l'appli installée
const COULEUR_BARRE = { clair: '#F2F2F7', sombre: '#000000' }

export function lireTheme() {
  try {
    const valeur = localStorage.getItem(CLE)
    return valeur in ATTRIBUT ? valeur : 'systeme'
  } catch {
    return 'systeme'
  }
}

export function appliquerTheme(theme) {
  const racine = document.documentElement
  if (ATTRIBUT[theme]) racine.dataset.theme = ATTRIBUT[theme]
  else delete racine.dataset.theme

  // Les balises theme-color d'index.html ont chacune un media (clair /
  // sombre) : un thème forcé impose sa couleur aux deux
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    if (!meta.dataset.origine) meta.dataset.origine = meta.content
    meta.content = COULEUR_BARRE[theme] ?? meta.dataset.origine
  }
}

export function choisirTheme(theme) {
  try {
    if (theme === 'systeme') localStorage.removeItem(CLE)
    else localStorage.setItem(CLE, theme)
  } catch {
    // stockage indisponible : le choix vaut pour cette visite seulement
  }
  appliquerTheme(theme)
}
