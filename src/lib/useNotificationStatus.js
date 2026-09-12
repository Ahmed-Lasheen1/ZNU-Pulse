import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { subscribeToPush } from './pushNotifications'

// Shared "is push actually working on this device right now" check —
// used by both NotifyPermissionButton and NotificationToggle so the
// two never disagree. `enabled` means a real, server-verified
// subscription — not just Notification.permission === 'granted',
// which can be true with no working subscription behind it.
export function useNotificationStatus() {
  const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  const [permission, setPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : null
  )
  const [enabled, setEnabled] = useState(false)
  const [checked, setChecked] = useState(false)

  const check = useCallback(async () => {
    if (!supported) { setChecked(true); return }

    const currentPermission = Notification.permission
    setPermission(currentPermission)

    if (currentPermission !== 'granted') {
      setEnabled(false)
      setChecked(true)
      return
    }

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()

      if (!sub) {
        setEnabled(false)
        setChecked(true)
        return
      }

      // Goes through an RPC (see push_subscription_exists) rather than
      // a direct select — see pushNotifications.js for the RLS reasoning.
      const { data: exists, error } = await supabase.rpc('push_subscription_exists', { p_endpoint: sub.endpoint })

      if (!error && exists) {
        setEnabled(true)
      } else {
        // Browser has a subscription and permission is granted, but the
        // server doesn't have it yet — try to silently (re)save it once.
        const result = await subscribeToPush()
        setEnabled(!!result.success)
      }
    } catch {
      setEnabled(false)
    }
    setChecked(true)
  }, [supported])

  useEffect(() => {
    let cancelled = false
    check()

    // Re-check on tab focus/visibility, to catch a permission change
    // made from the browser's own site-settings UI while backgrounded.
    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && !cancelled) check()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onVisibilityChange)
    }
  }, [check])

  return { supported, permission, enabled, checked, refresh: check }
}
