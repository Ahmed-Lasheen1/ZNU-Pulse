// src/lib/useBodyScrollLock.js
import { useEffect } from 'react'

// Prevents the real page behind a full-screen fixed overlay from being
// scrollable while it's open. Counter-based so nested/stacked overlays
// (if that ever happens) don't restore scroll early when only one closes.
let lockCount = 0
let previousOverflow = ''

export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return
    if (lockCount === 0) previousOverflow = document.body.style.overflow
    lockCount++
    document.body.style.overflow = 'hidden'
    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) document.body.style.overflow = previousOverflow
    }
  }, [active])
}
