// src/lib/useLimitedAppearance.js
// Shows a quiet, bounded prompt for a fixed number of page loads, then
// hides it permanently — used for anything the person can always go
// find on their own later (enabling notifications from Profile,
// signing in from the nav menu), where repeating the exact same
// prompt on every single reload just trains people to stop seeing it.
//
// Counts real page loads, not re-renders: the increment only fires
// once per mount (guarded by a ref) and only once `active` is true, so
// a component that renders early but stays hidden by its own other
// conditions (e.g. NotifyPermissionButton before its status check
// resolves) never burns through the budget before it actually has
// something to show. The count lives in localStorage rather than
// sessionStorage/in-memory, since "gone forever" has to survive full
// reloads, not just the current tab session.
import { useState, useRef, useEffect } from 'react'

const DEFAULT_MAX_SHOWS = 3

export function useLimitedAppearance(key, active, maxShows = DEFAULT_MAX_SHOWS) {
  const [allowed, setAllowed] = useState(false)
  const countedRef = useRef(false)

  useEffect(() => {
    if (!active || countedRef.current) return
    countedRef.current = true
    const storageKey = `${key}_shown_count`
    try {
      const count = parseInt(localStorage.getItem(storageKey) || '0', 10) || 0
      if (count < maxShows) {
        localStorage.setItem(storageKey, String(count + 1))
        setAllowed(true)
      }
    } catch {
      // Storage unavailable (private browsing, quota, etc.) — fail
      // open rather than silently hiding something the person could
      // otherwise act on.
      setAllowed(true)
    }
  }, [key, active, maxShows])

  return allowed
}
