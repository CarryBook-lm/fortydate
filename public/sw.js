// FortyDate — service worker
// v2 : ne provoque plus de page blanche en cas de coupure réseau.
const CACHE = 'fortydate-v2'
const REPLI = '/hors-ligne.html'

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then(c => c.addAll([REPLI])).catch(() => {}))
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // On efface les anciens caches (dont ceux de la v1)
    const noms = await caches.keys()
    await Promise.all(noms.filter(n => n !== CACHE).map(n => caches.delete(n)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  let url
  try { url = new URL(req.url) } catch (_) { return }

  // On ne touche JAMAIS aux appels serveur : ni /api/, ni Supabase, ni domaines tiers.
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // Ouverture d'une page : réseau d'abord, sinon page de repli lisible.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        return await fetch(req)
      } catch (_) {
        return (await caches.match(req)) || (await caches.match(REPLI)) ||
          new Response('<h1>Hors ligne</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }
    })())
    return
  }

  // Ressources statiques : réseau, copie en cache, repli sur le cache si le réseau tombe.
  e.respondWith((async () => {
    try {
      const r = await fetch(req)
      if (r && r.ok && /\.(js|css|png|jpg|jpeg|svg|webmanifest)$/i.test(url.pathname)) {
        const copie = r.clone()
        caches.open(CACHE).then(c => c.put(req, copie)).catch(() => {})
      }
      return r
    } catch (_) {
      const cache = await caches.match(req)
      if (cache) return cache
      return new Response('', { status: 504, statusText: 'Hors ligne' })
    }
  })())
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
    vibrate: [200, 100, 200],
    silent: false,
    requireInteraction: false,
    timestamp: Date.now(),
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
