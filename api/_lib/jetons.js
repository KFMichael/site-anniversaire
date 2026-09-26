// Jetons des boutons d'action du récap par email : { u (utilisateur),
// e (espace), a (action), c (cible), m (mois, facultatif), x (expiration) }
// sérialisés en JSON, signés en HMAC-SHA256. Un jeton ne permet qu'une
// action précise, pour un membre et un espace, jusqu'à son expiration.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const DUREE_VALIDITE_S = 8 * 24 * 3600

// Clé dédiée, dérivée du secret de la tâche planifiée (pas de variable de
// plus à configurer, et un jeton d'action ne peut pas servir d'autre chose)
export function cleActions(secret) {
  return createHmac('sha256', secret).update('nido-actions-v1').digest()
}

function signer(cle, donnees) {
  return createHmac('sha256', cle).update(donnees).digest('base64url')
}

export function creerJeton(cle, contenu, maintenant = Date.now()) {
  const charge = Buffer.from(
    JSON.stringify({ ...contenu, x: Math.floor(maintenant / 1000) + DUREE_VALIDITE_S })
  ).toString('base64url')
  return `${charge}.${signer(cle, charge)}`
}

// Renvoie le contenu du jeton, ou null s'il est invalide ou expiré
export function lireJeton(cle, jeton, maintenant = Date.now()) {
  if (typeof jeton !== 'string') return null
  const [charge, signature] = jeton.split('.')
  if (!charge || !signature) return null
  const attendue = Buffer.from(signer(cle, charge))
  const recue = Buffer.from(signature)
  if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return null
  try {
    const contenu = JSON.parse(Buffer.from(charge, 'base64url').toString())
    return contenu.x > maintenant / 1000 ? contenu : null
  } catch {
    return null
  }
}
