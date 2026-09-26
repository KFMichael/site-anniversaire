// Envoi réel via le protocole Web Push (bibliothèque web-push, clés VAPID)
import webpush from 'web-push'

export function creerEnvoiPush({ clePublique, clePrivee, sujet }) {
  webpush.setVapidDetails(sujet, clePublique, clePrivee)
  return (abonnement, notification) =>
    webpush.sendNotification(
      { endpoint: abonnement.endpoint, keys: { p256dh: abonnement.p256dh, auth: abonnement.auth } },
      JSON.stringify(notification),
      // Une notification du soir qui arrive le lendemain n'a plus de sens
      { TTL: 6 * 3600, urgency: 'normal' }
    )
}

// Envoi configuré depuis les variables d'environnement, ou null si les
// notifications ne sont pas configurées (les emails partent quand même)
export function configurationPush() {
  const clePublique = process.env.VITE_VAPID_CLE_PUBLIQUE
  const clePrivee = process.env.VAPID_CLE_PRIVEE
  if (!clePublique || !clePrivee) return null
  return creerEnvoiPush({ clePublique, clePrivee, sujet: process.env.APP_URL || 'mailto:recap@nido.4sept.com' })
}
