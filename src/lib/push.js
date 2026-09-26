// Notifications sur le téléphone, côté appli : détection de ce que permet
// l'appareil, abonnement et désabonnement. Le service worker est public/sw.js.
import { supabase } from './supabase'

const CLE_PUBLIQUE = import.meta.env.VITE_VAPID_CLE_PUBLIQUE

export const pushConfigure = Boolean(CLE_PUBLIQUE)

export function estIOS() {
  return /iPhone|iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}

export function estInstallee() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
}

function pushSupporte() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function enregistrerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // pas bloquant : seules les notifications en dépendent
  })
}

async function abonnementActuel() {
  const enregistrement = await navigator.serviceWorker.getRegistration()
  return enregistrement ? enregistrement.pushManager.getSubscription() : null
}

// 'a-installer' (iPhone : ajouter Nido à l'écran d'accueil d'abord),
// 'non-supporte', 'refuse' (permission refusée dans les réglages),
// 'actif' ou 'inactif'
export async function etatNotifications() {
  if (!pushSupporte()) return estIOS() && !estInstallee() ? 'a-installer' : 'non-supporte'
  if (Notification.permission === 'denied') return 'refuse'
  return (await abonnementActuel()) ? 'actif' : 'inactif'
}

function versOctets(base64Url) {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

function nomAppareil() {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'Appareil'
}

// À appeler depuis un tap (iOS n'autorise la demande de permission que sur
// un geste). Renvoie null si tout va bien, sinon un message d'erreur.
export async function activerNotifications() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return 'Notifications refusées. Tu peux les autoriser dans Réglages › Notifications › Nido.'
  }
  try {
    const enregistrement = await navigator.serviceWorker.ready
    const abonnement =
      (await enregistrement.pushManager.getSubscription()) ??
      (await enregistrement.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: versOctets(CLE_PUBLIQUE),
      }))
    const { endpoint, keys } = abonnement.toJSON()
    const { error } = await supabase.rpc('enregistrer_abonnement_push', {
      p_endpoint: endpoint,
      p_p256dh: keys.p256dh,
      p_auth: keys.auth,
      p_appareil: nomAppareil(),
    })
    return error ? "L'appareil n'a pas pu être enregistré." : null
  } catch {
    return "L'activation a échoué sur cet appareil."
  }
}

export async function desactiverNotifications() {
  const abonnement = await abonnementActuel()
  if (!abonnement) return null
  await supabase.from('abonnements_push').delete().eq('endpoint', abonnement.endpoint)
  await abonnement.unsubscribe()
  return null
}
