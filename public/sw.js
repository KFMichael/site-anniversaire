// Service worker de Nido : uniquement les notifications (Web Push).
// Volontairement aucun cache : l'appli est toujours servie à jour.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Contenu envoyé par api/_lib/notifications.js : { titre, corps, url, tag }
self.addEventListener('push', (event) => {
  let donnees = {}
  try {
    donnees = event.data ? event.data.json() : {}
  } catch {
    donnees = { corps: event.data?.text() }
  }
  event.waitUntil(
    self.registration.showNotification(donnees.titre || 'Nido', {
      body: donnees.corps || '',
      tag: donnees.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: donnees.url || '/' },
    })
  )
})

// Toucher la notification ouvre le bon écran, en réutilisant la fenêtre
// de Nido si elle est déjà ouverte
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const fenetre = fenetres.find((f) => new URL(f.url).origin === self.location.origin)
      if (fenetre) {
        await fenetre.focus()
        if ('navigate' in fenetre) await fenetre.navigate(url)
        return
      }
      await self.clients.openWindow(url)
    })()
  )
})
