import { useEffect, useSyncExternalStore } from 'react'

// Shared "the header brand must not navigate" flag. Module-level and ref-counted, so it needs no provider
// and stays correct if two locking screens ever overlap.
let lockCount = 0
const listeners = new Set()

// Tells subscribers that the lock state may have changed.
function notify() {
  listeners.forEach(listener => listener())
}

// Registers a change listener for useSyncExternalStore; returns an unsubscribe function.
function subscribe(listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

// Current lock state.
function getSnapshot() {
  return lockCount > 0
}

// True while any screen asks for the header brand to be locked (read by the site header).
export function useBrandLocked() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

// Locks the header brand while `active` is true (used by study sessions so a stray tap cannot leave them).
export function useLockBrandWhile(active) {
  useEffect(() => {
    if (!active) return
    lockCount++
    notify()
    return () => {
      lockCount = Math.max(0, lockCount - 1)
      notify()
    }
  }, [active])
}
