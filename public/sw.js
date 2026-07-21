// Service worker minimal — requis pour rendre FortyDate installable
const CACHE = 'fortydate-v1'

self.addEventListener('install', (e) => { self.skipWaiting() })

self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })

self.addEventListener('fetch', (e) => {
  // Stratégie simple : réseau d'abord, puis on laisse passer.
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})

// --- Notifications push (affichage) ---
self.addEventListener('push', (e) => {
  let data = {}
  try {
    data = e.data ? e.data.json() : {}
  } catch (err) {
    data = { title: 'FortyDate', body: e.data ? e.data.text() : '' }
  }
  const title = data.title || 'FortyDate'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag,
    renotify: true,
    data: { url: data.url || '/' }
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

// --- Clic sur la notif : ouvre / met au premier plan l'appli ---
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(url) && 'focus' in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
