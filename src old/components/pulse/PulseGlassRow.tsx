import { useState, type CSSProperties, type ReactNode, type KeyboardEvent } from 'react'
import { liquidGlassBackdrop, liquidGlassShadow, liquidGlassTint } from '../../lib/liquidGlass'

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
}

// Same three-layer glass recipe already used by NavMenu.jsx's local
// GlassRow (backdrop blur + shadow + neutral tint) — pulled out here
// so other pages (starting with ModuleTabs) can reuse the identical
// treatment instead of inventing a new one.
export default function PulseGlassRow({
  dark, radius = 16, active, activeTint, hoverTint, onClick, style = {}, children, ...rest
}: PulseGlassRowProps) {
  const [hovered, setHovered] = useState(false)
  const interactive = !!onClick

  return (
    <div
      {...rest}
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
