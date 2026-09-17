// ZNU Future Doctors — minimal service worker.
// Goal: make the app installable and keep the shell available offline,
// without needing a build-time list of hashed asset filenames.

// ملحوظة: رقم النسخة اتزود من v1 لـ v2 عشان أي جهاز فتح الموقع قبل كده
// (وكانت متخزنة عنده نسخة قديمة من الأيقونات، أو من غير أيقونات خالص)
// يجبر المتصفح إنه يمسح الكاش القديم ويجيب كل حاجة جديدة، من ضمنها
// الأيقونات الجديدة.
const CACHE_NAME = 'znu-shell-v6'
const SHELL_URLS = ['/', '/favicon.svg', '/icon-192.png', '/icon-512.png']

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

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // let Supabase/API calls go straight to network

  // Page navigations: try the network first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    )
    return
  }

  // Static assets: cache-first, then update the cache in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => cached)
      return cached || networkFetch
    })
  )
})

// ── Web Push ─────────────────────────────────────────────────────
// Shows the notification even if no tab is open — this is what makes
// exam reminders, weekly reports, and admin broadcasts arrive while
// the site itself is fully closed.
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
    data: { url: data.url || '/' }
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Tapping the notification focuses an already-open tab if there is
// one, otherwise opens a new one at the relevant page.
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
