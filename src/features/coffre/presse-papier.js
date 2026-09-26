// Copie une valeur sensible puis tente de vider le presse-papier au bout de
// 30 s. Le vidage est « au mieux » : le navigateur le refuse si la page n'a
// plus le focus, et on ne peut pas vérifier que la valeur y est toujours.
const DELAI_EFFACEMENT_MS = 30_000
let minuteur = null

export async function copierTemporairement(valeur) {
  await navigator.clipboard.writeText(valeur)
  clearTimeout(minuteur)
  minuteur = setTimeout(() => {
    navigator.clipboard.writeText('').catch(() => {})
  }, DELAI_EFFACEMENT_MS)
}

// N'affiche en lien cliquable que les adresses web : une URL « javascript: »
// enregistrée dans une entrée ne doit pas pouvoir s'exécuter au clic
export function urlSure(url) {
  if (!url) return null
  const avecSchema = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
  try {
    const u = new URL(avecSchema)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
  } catch {
    return null
  }
}
