import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import PulseOverlayHeader from '@/app/shell/PulseOverlayHeader'
import { useHomeEntrance } from '@/core/contexts'
import Footer from '@/app/shell/Footer'

export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export function SiteHeader({ dark, toggleTheme }) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  return (
    <>
      <PulseOverlayHeader dark={dark} toggleTheme={toggleTheme} />
      {!isHome && <div style={{ height: 'calc(76px + env(safe-area-inset-top, 0px))' }} />}
    </>
  )
}

export function SiteFooter({ dark }) {
  const { playEntrance } = useHomeEntrance()
  return <Footer dark={dark} animate={playEntrance} />
}
