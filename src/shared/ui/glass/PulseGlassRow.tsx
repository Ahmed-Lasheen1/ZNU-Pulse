import { useState, type CSSProperties, type ReactNode, type KeyboardEvent } from 'react'
import { liquidGlassBackdrop, liquidGlassShadow, liquidGlassTint } from '@/shared/theme/liquidGlass'

interface PulseGlassRowProps {
  dark: boolean
  radius?: number
  active?: boolean
  activeTint?: string
  hoverTint?: string
  onClick?: () => void
  style?: CSSProperties
  children: ReactNode
  role?: string
  tabIndex?: number
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
  'aria-label'?: string
  'aria-pressed'?: boolean
}

// Same three-layer glass recipe already used by NavMenu.jsx's local
// GlassRow (backdrop blur + shadow + neutral tint) — pulled out here
// so other pages can reuse the identical treatment.
// A row with an onClick is a keyboard-accessible button by default (role, tab stop, Enter/Space);
// callers may still pass their own role, tabIndex or onKeyDown to override.
export default function PulseGlassRow({
  dark, radius = 16, active, activeTint, hoverTint, onClick, style = {}, children, role, tabIndex, onKeyDown, ...rest
}: PulseGlassRowProps) {
  const [hovered, setHovered] = useState(false)
  const interactive = !!onClick

  // Activates the row with Enter or Space when the row itself (not a nested control) has focus.
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      {...rest}
      role={role ?? (interactive ? 'button' : undefined)}
      tabIndex={tabIndex ?? (interactive ? 0 : undefined)}
      onKeyDown={onKeyDown ?? (interactive ? handleKeyDown : undefined)}
      onClick={onClick}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: radius,
        cursor: interactive ? 'pointer' : 'default', ...style,
      }}
    >
      <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', ...liquidGlassBackdrop() }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: liquidGlassShadow(dark) }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: active && activeTint ? activeTint : liquidGlassTint(dark) }} />
      {hovered && hoverTint && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: hoverTint }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
