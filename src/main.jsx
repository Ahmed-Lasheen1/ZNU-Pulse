import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/app/App.jsx'
import { storageGet, storageSet } from '@/core/safeStorage'
import '@/styles/index.css'

const PRELOAD_RELOAD_KEY = 'znu_preload_reload_at'
const PRELOAD_RELOAD_COOLDOWN_MS = 30 * 1000

// Reloads once to pick up a new deployment when a lazy page chunk can no longer be loaded.
// It stays quiet offline (a reload would not help), waits 30 seconds between reloads, and skips the reload
// entirely when the guard cannot be saved, so it can never loop. Otherwise the error reaches the ErrorBoundary.
window.addEventListener('vite:preloadError', (event) => {
  if (!navigator.onLine) return
  const lastReloadAt = Number(storageGet(PRELOAD_RELOAD_KEY) || 0)
  if (Date.now() - lastReloadAt < PRELOAD_RELOAD_COOLDOWN_MS) return
  if (!storageSet(PRELOAD_RELOAD_KEY, String(Date.now()))) return
  event.preventDefault()
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
