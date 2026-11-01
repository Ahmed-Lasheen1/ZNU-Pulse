import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts'
import { subscribeToPush, getSwRegistration } from './pushNotifications'

// Shared by every hook instance so the server check runs once per window.
const VERIFY_TTL_MS = 5 * 60 * 1000
let verified = null
const claimed = new Set()

// "Is push actually on for this device" — shared by NotifyPermissionButton
// and NotificationToggle. `enabled` means a real, server-verified subscription.
export function useNotificationStatus() {
  const { user } = useAuth()
  const userId = user?.id || null
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

  const check = useCallback(async (force = false) => {
    if (!supported) { if (mountedRef.current) setChecked(true); return }

    const currentPermission = Notification.permission
    if (!mountedRef.current) return
    setPermission(currentPermission)

    if (currentPermission !== 'granted') {
      verified = null
      if (mountedRef.current) { setEnabled(false); setChecked(true) }
      return
    }

    try {
      const reg = await getSwRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null

      if (!sub) {
        verified = null
        if (mountedRef.current) { setEnabled(false); setChecked(true) }
        return
      }

      const fresh = !force && verified?.endpoint === sub.endpoint && Date.now() - verified.at < VERIFY_TTL_MS

      if (fresh) {
        if (mountedRef.current) setEnabled(true)
      } else {
        const { data: exists, error } = await supabase.rpc('push_subscription_exists', { p_endpoint: sub.endpoint })
        if (!mountedRef.current) return

        // On a transient RPC error, don't assume "missing" and resubscribe.
        if (!error) {
          if (exists) {
            verified = { endpoint: sub.endpoint, at: Date.now() }
            setEnabled(true)
          } else {
            const result = await subscribeToPush()
            if (!mountedRef.current) return
            if (result.success) verified = { endpoint: sub.endpoint, at: Date.now() }
            setEnabled(!!result.success)
          }
        }
      }

      // A guest row stays unowned until the RPC runs again while signed in.
      const claimKey = userId ? `${userId}:${sub.endpoint}` : null
      if (claimKey && verified?.endpoint === sub.endpoint && !claimed.has(claimKey)) {
        claimed.add(claimKey)
        subscribeToPush()
      }
    } catch {
      if (mountedRef.current) setEnabled(false)
    }
    if (mountedRef.current) setChecked(true)
  }, [supported, userId])

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

  const refresh = useCallback(() => check(true), [check])

  return { supported, permission, enabled, checked, refresh }
}
