import { supabase } from '../supabase'

// Public half of the VAPID keypair — safe to expose to the browser.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

// Call right after Notification permission is granted, and also
// silently on every page load, to keep the server-side record in
// sync. Reuses an existing browser subscription if present.
//
// Saves via the upsert_push_subscription RPC rather than a direct
// table upsert — RLS locks push_subscriptions to "a row you already
// own," so this security-definer RPC can see the one row matching
// this endpoint, insert if new, and claim it via auth.uid() without
// broader table access. If already claimed by a different account,
// it silently no-ops.
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
    const reg = await navigator.serviceWorker.ready
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

// Turns push off for this device — unsubscribes the browser's own
// PushManager subscription and removes the matching server row (via
// a security-definer RPC, since guest rows have user_id IS NULL and
// RLS's `auth.uid() = user_id` never matches NULL = NULL).
export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, reason: 'unsupported' }
  }

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
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
