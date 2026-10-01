// Voyages de la carte : résultats de la recherche de lieux (OpenStreetMap
// Nominatim), tri, centre de la carte. Logique pure, testée par
// voyages.test.js.

// Centre par défaut (Paris) quand aucun voyage n'est enregistré
export const CENTRE_DEFAUT = [48.8566, 2.3522]

// Adresse de recherche Nominatim (en français, 5 résultats au plus)
export function urlRecherche(texte) {
  const q = encodeURIComponent(texte.trim())
  return `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=fr&q=${q}`
}

// « Lisbonne, Lisboa, Portugal » : nom du lieu, puis le reste en détail ;
// les résultats sans coordonnées valides sont écartés
export function lireResultats(json) {
  if (!Array.isArray(json)) return []
  return json
    .map((r) => {
      const latitude = Number(r.lat)
      const longitude = Number(r.lon)
      const morceaux = String(r.display_name ?? '').split(',').map((m) => m.trim()).filter(Boolean)
      const nom = r.name || morceaux[0]
      const pays = morceaux.at(-1)
      return {
        lieu: (nom && pays && nom !== pays ? `${nom}, ${pays}` : nom ?? '').slice(0, 120),
        detail: morceaux.join(', '),
        latitude,
        longitude,
      }
    })
    .filter((r) => r.lieu && coordonneesValides(r.latitude, r.longitude))
}

export function coordonneesValides(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
}

// Les plus récents d'abord ; sans date, à la fin, par ordre d'ajout
export function trierVoyages(voyages) {
  return [...voyages].sort((a, b) => {
    if (a.date_voyage && b.date_voyage) return b.date_voyage.localeCompare(a.date_voyage)
    if (a.date_voyage || b.date_voyage) return a.date_voyage ? -1 : 1
    return (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })
}

// Centre de la carte : le voyage le plus récent, sinon Paris
export function centreCarte(voyages) {
  const premier = trierVoyages(voyages)[0]
  return premier ? [premier.latitude, premier.longitude] : CENTRE_DEFAUT
}

// « mai 2024 »
export function libelleDateVoyage(date) {
  if (!date) return ''
  const [a, m] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(a, m - 1, 1))
}
