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
