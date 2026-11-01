import { useState, useRef, useEffect } from 'react'

const DEFAULT_MAX_SHOWS = 3
// key -> whether this session already resolved (and possibly spent) its slot
const sessionState = new Map()

export function useLimitedAppearance(key, active, maxShows = DEFAULT_MAX_SHOWS) {
  const [allowed, setAllowed] = useState(() => sessionState.get(key) === true)
  const countedRef = useRef(false)

  useEffect(() => {
    if (!active || countedRef.current) return
    countedRef.current = true

    if (sessionState.has(key)) {
      setAllowed(sessionState.get(key))
      return
    }

    const storageKey = `${key}_shown_count`
    let result = true
    try {
      const count = parseInt(localStorage.getItem(storageKey) || '0', 10) || 0
      result = count < maxShows
      if (result) localStorage.setItem(storageKey, String(count + 1))
    } catch {
      result = true
    }
    sessionState.set(key, result)
    setAllowed(result)
  }, [key, active, maxShows])

  return allowed
}
