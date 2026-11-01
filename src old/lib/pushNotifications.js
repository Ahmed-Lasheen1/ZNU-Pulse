import { supabase } from '../supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

// Resolves null instead of hanging forever when no service worker is active.
export function getSwRegistration(timeoutMs = 4000) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(null)
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ])
}

// Idempotent: reuses an existing browser subscription and (via the RPC)
// claims an unowned guest row for the signed-in user.
export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[push] Push not supported in this browser.')
    return { success: false, reason: 'unsupported' }
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error('[push] Missing VITE_VAPID_PUBLIC_KEY — check Vercel env vars and redeploy.')
    return { success: false, reason: 'missing_vapid_key' }
  }

  try {
    const reg = await getSwRegistration()
    if (!reg) return { success: false, reason: 'subscribe_exception' }

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    }

    const subJson = sub.toJSON()
    const { error } = await supabase.rpc('upsert_push_subscription', {
      p_endpoint: subJson.endpoint,
      p_p256dh: subJson.keys.p256dh,
      p_auth: subJson.keys.auth
    })

    if (error) {
      console.error('[push] Could not save subscription to Supabase:', error)
      return { success: false, reason: 'db_insert_failed', error }
    }

    return { success: true, endpoint: subJson.endpoint }
  } catch (e) {
    console.error('[push] Subscription failed:', e)
    return { success: false, reason: 'subscribe_exception', error: e }
  }
}

// Removes the browser subscription and the matching server row.
export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, reason: 'unsupported' }
  }

  try {
    const reg = await getSwRegistration()
    const sub = reg ? await reg.pushManager.getSubscription() : null
    if (!sub) return { success: true }

    const endpoint = sub.endpoint
    await sub.unsubscribe()

    const { error } = await supabase.rpc('delete_push_subscription', { p_endpoint: endpoint })
    if (error) {
      console.warn('[push] Could not remove subscription from Supabase:', error)
      return { success: false, reason: 'db_delete_failed', error }
    }
    return { success: true }
  } catch (e) {
    console.warn('[push] Unsubscribe failed:', e)
    return { success: false, reason: 'unsubscribe_exception', error: e }
  }
}
