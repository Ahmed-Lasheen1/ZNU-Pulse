import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { subscribeToPush } from './pushNotifications'

// "Is push actually on for this device" — shared by NotifyPermissionButton
// and NotificationToggle so they never disagree. `enabled` means a real,
// server-verified subscription.
export function useNotificationStatus() {
  const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  const [permission, setPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : null
  )
  const [enabled, setEnabled] = useState(false)
  const [checked, setChecked] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const check = useCallback(async () => {
    if (!supported) { if (mountedRef.current) setChecked(true); return }

    const currentPermission = Notification.permission
    if (!mountedRef.current) return
    setPermission(currentPermission)

    if (currentPermission !== 'granted') {
      if (mountedRef.current) { setEnabled(false); setChecked(true) }
      return
    }

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()

      if (!sub) {
        if (mountedRef.current) { setEnabled(false); setChecked(true) }
        return
      }

      const { data: exists, error } = await supabase.rpc('push_subscription_exists', { p_endpoint: sub.endpoint })
      if (!mountedRef.current) return

      if (error) {
        // RPC failed — don't assume "not found" and resubscribe on a transient error.
      } else if (exists) {
        setEnabled(true)
      } else {
        const result = await subscribeToPush()
        if (!mountedRef.current) return
        setEnabled(!!result.success)
      }
    } catch {
      if (mountedRef.current) setEnabled(false)
    }
    if (mountedRef.current) setChecked(true)
  }, [supported])

  useEffect(() => {
    let cancelled = false
    check()

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
