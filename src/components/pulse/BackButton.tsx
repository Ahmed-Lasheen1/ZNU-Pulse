import type { CSSProperties } from 'react'
import { useGoBack } from '../../lib/useGoBack'
import { getPulseTheme, pulseType } from '../../premiumTheme'
import PulseGlassRow from './PulseGlassRow'

interface BackButtonProps {
  dark: boolean
  fallback?: string
  onClick?: () => void
  style?: CSSProperties
}

// Fixed to the viewport so it stays in the exact same on-screen spot
// regardless of scroll position — previously this rendered inline at
// the top of each page's scrollable content, so it scrolled away the
// moment the student scrolled down, and its resting position (before
// any scrolling) depended on that page's own top padding.
//
// Positioned to sit just below the header's real rendered height:
// 16px top padding + 44px logo/icon row height + 16px bottom padding
// (see PulseOverlayHeader.jsx), plus a small fixed gap so the pill
// doesn't touch the header bar.
const HEADER_GAP = 0

export default function BackButton({ dark, fallback = '/', onClick, style }: BackButtonProps) {
  const pt = getPulseTheme(dark)
  const goBack = useGoBack(fallback)
  const handleClick = onClick || goBack
  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'

  return (
    <div
      style={{
        position: 'fixed',
        top: `calc(16px + 60px + ${HEADER_GAP}px)`,
        left: 'clamp(20px, 4vw, 64px)',
        zIndex: 400,
      }}
    >
      <PulseGlassRow
        dark={dark} radius={999} hoverTint={hoverTint} onClick={handleClick}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}
        style={{ display: 'inline-flex', width: 'fit-content', ...style }}
      >
        <div style={{ padding: '8px 18px', ...pulseType.small, fontWeight: 700, color: pt.sub }}>← Back</div>
      </PulseGlassRow>
    </div>
  )
}
