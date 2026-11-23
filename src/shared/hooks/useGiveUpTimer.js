import { useState, useEffect } from 'react'

// Longest a loading screen waits for a link-started session before the browse page is shown instead.
export const AUTO_START_TIMEOUT_MS = 10000

// True once `enabled` has stayed on for `ms`, so a link auto-start that never finishes cannot trap the student on a loading screen.
export function useGiveUpTimer(enabled, ms = AUTO_START_TIMEOUT_MS) {
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const timer = setTimeout(() => setGaveUp(true), ms)
    return () => clearTimeout(timer)
  }, [enabled, ms])

  return gaveUp
}
