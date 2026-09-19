// src/lib/localNotification.js
// Shows an in-page notification (used by Checklist and AnonQuestions).
//
// Why this exists: Chrome for Android doesn't allow `new Notification()`
// from a page — it throws "Illegal constructor. Use
// ServiceWorkerRegistration.showNotification() instead." Because that
// call ran inside a useEffect, the exception bubbled up to ErrorBoundary
// and blanked the whole page for Android users who had notifications on.
// Going through the service worker registration works on every platform;
// `new Notification()` is only a last-resort fallback, and the whole
// thing is wrapped so a failure here can never crash a page.
export async function showLocalNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false

  const finalOptions = { icon: '/icon-192.png', badge: '/icon-192.png', ...options }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(title, finalOptions)
        return true
      }
    }
    new Notification(title, finalOptions)
    return true
  } catch (e) {
    console.warn('[localNotification] Could not show notification:', e)
    return false
  }
}
