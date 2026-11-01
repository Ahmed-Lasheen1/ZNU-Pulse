import { useState, useEffect } from 'react'

// Shared reduced-motion check for entrance/idle animations. See
// kinetic-grid.tsx for a ref-based variant used inside its own rAF
// loop, where a re-render per change would be wasteful.
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e) => setReduced(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return reduced
}
