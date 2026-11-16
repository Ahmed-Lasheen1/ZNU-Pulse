import type { CSSProperties } from 'react'
import { useGoBack } from '@/shared/hooks/useGoBack'
import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
import { glassHoverTint } from '@/shared/theme/liquidGlass'

interface BackButtonProps {
  dark: boolean
  fallback?: string
  onClick?: () => void
  style?: CSSProperties
}

// Back pill fixed to the viewport, so it stays in the same on-screen spot regardless of scroll position.
// `top` sits just below the header's rendered height (16px top padding + 44px logo row + 16px bottom padding,
// see PulseOverlayHeader.jsx) plus env(safe-area-inset-top), because index.html sets viewport-fit=cover and
// the page bleeds under the notch/status bar. The safe-area inset is 0px where there is no notch.
export default function BackButton({ dark, fallback = '/', onClick, style }: BackButtonProps) {
  const pt = getPulseTheme(dark)
  const goBack = useGoBack(fallback)
  const handleClick = onClick || goBack
  const hoverTint = glassHoverTint(dark)

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(16px + 60px + env(safe-area-inset-top, 0px))',
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
