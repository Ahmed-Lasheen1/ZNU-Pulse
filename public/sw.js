// ZNU Future Doctors — minimal service worker: installable app + offline shell.

const CACHE_NAME = 'znu-shell-v9'
const SHELL_URLS = ['/', '/favicon.svg', '/logo.svg', '/icon-192.png', '/icon-512.png']
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']
const IMMUTABLE_PREFIX = '/assets/'
const MAX_CACHE_ENTRIES = 150

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS).catch(() => {}))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Stops old hashed assets from piling up.
async function trimCache(cache) {
  const keys = await cache.keys()
  if (keys.length <= MAX_CACHE_ENTRIES) return
  const removable = keys.filter((req) => !SHELL_URLS.includes(new URL(req.url).pathname))
  await Promise.all(removable.slice(0, keys.length - MAX_CACHE_ENTRIES).map((req) => cache.delete(req)))
}

function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (response && (response.ok || response.type === 'opaque')) {
      const copy = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy).then(() => trimCache(cache)))
    }
    return response
  })
}

// Hashed build assets never change, so a cached copy is used as-is;
// everything else is refreshed in the background.
async function cachedAsset(request, revalidate) {
  const cached = await caches.match(request)
  if (cached && !revalidate) return cached
  const network = fetchAndCache(request).catch(() => cached)
  return cached || network
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const isFont = FONT_HOSTS.includes(url.hostname)
  if (url.origin !== self.location.origin && !isFont) return

  // Navigations: network first, cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
          }
          return response
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  event.respondWith(cachedAsset(request, !url.pathname.startsWith(IMMUTABLE_PREFIX)))
})

// Shows the notification even when no tab is open.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'ZNU Future Doctors', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'ZNU Future Doctors'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    lang: data.lang || 'en',
    data: { url: data.url || '/' }
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Focuses an open tab if there is one, otherwise opens the page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(url).then((navigatedClient) => navigatedClient?.focus())
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
