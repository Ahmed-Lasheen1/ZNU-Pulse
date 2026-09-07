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
// AUDIT FIX (root cause, not just the earlier buffer trim): this used
// to assume the header's total height was a flat `76px +
// env(safe-area-inset-top)` — i.e. a fixed 16px PLUS the full
// safe-area inset, added together. But the real header
// (PulseOverlayHeader.tsx) sets its own top padding as
// `max(16px, env(safe-area-inset-top))` — it uses WHICHEVER is
// bigger, never both. On a phone with a notch/Dynamic Island, the
// safe-area inset is typically 47–59px, so the old formula was
// double-counting that extra 16px and placing this button about 16px
// lower than the header's actual bottom edge — which is exactly why
// trimming the old "+24px" buffer down to "+0px" didn't fully close
// the gap; the leftover 16px was baked into the base formula itself,
// not the tunable buffer.
//
// Corrected to mirror the header's real math: `max(16px,
// env(safe-area-inset-top))` for the top padding, `+ 44px` for the
// logo/icon row height, `+ 16px` for the header's bottom padding —
// i.e. the header's true rendered height — plus a small fixed gap so
// the pill doesn't touch the header bar.
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
        top: `calc(max(16px, env(safe-area-inset-top)) + 60px + ${HEADER_GAP}px)`,
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
