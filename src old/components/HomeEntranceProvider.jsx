import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { HomeEntranceContext } from '../contexts'

// Render inside <Router>. Decides when Home's entrance plays: the first time
// Home is shown after a page load (even if you landed elsewhere first), never again
// until the next reload. Home and the site header both read this.
export default function HomeEntranceProvider({ children }) {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  const [consumed, setConsumed] = useState(false)
  const [entranceRun, setEntranceRun] = useState(isHome ? 1 : 0)

  const playEntrance = isHome && !consumed

  // Landed elsewhere first, and Home is appearing for the first time.
  if (playEntrance && entranceRun === 0) setEntranceRun(1)

  useEffect(() => {
    if (isHome) setConsumed(true)
  }, [isHome])

  const value = useMemo(() => ({ playEntrance, entranceRun }), [playEntrance, entranceRun])

  return <HomeEntranceContext.Provider value={value}>{children}</HomeEntranceContext.Provider>
}
