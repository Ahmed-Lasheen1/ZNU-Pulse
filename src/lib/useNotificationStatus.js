import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { subscribeToPush } from './pushNotifications'

// Shared "is push actually working on this device right now" check —
// used by NotifyPermissionButton and NotificationToggle so they never
// disagree. `enabled` means a real, server-verified subscription.
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

      const { data: exists, error } = await supabase.rpc('push_subscription_exists', { p_endpoint: sub.endpoint })

      if (!error && exists) {
        setEnabled(true)
      } else {
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

    // visibilitychange and focus can both fire for the same "tab came
    // back" event — this collapses a same-tick pair into one check().
    let pending = false
    function scheduleCheck() {
      if (pending || cancelled) return
      pending = true
      setTimeout(() => { pending = false; if (!cancelled) check() }, 50)
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') scheduleCheck()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', scheduleCheck)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', scheduleCheck)
    }
  }, [check])

  return { supported, permission, enabled, checked, refresh: check }
}
