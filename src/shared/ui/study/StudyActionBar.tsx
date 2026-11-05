import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { pulseFonts, ON_GRADIENT_BOTTOM } from '@/shared/theme/premiumTheme'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'

const BAR_Z_INDEX = 450
const BAR_TINT = 'rgba(1,12,74,0.55)'

// Base look of the pill buttons placed inside the bar.
export const BAR_BUTTON_BASE: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  height: 46, padding: 0, boxSizing: 'border-box', borderRadius: 999, cursor: 'pointer',
  fontFamily: pulseFonts.body, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
}

interface StudyActionBarProps {
  dark: boolean
  ariaLabel: string
  onHeightChange?: (height: number) => void
  maxWidth?: string
  hint?: ReactNode
  children: ReactNode
}

// Fixed bottom action bar; reports its height and lifts toasts above itself.
export default function StudyActionBar({
  dark, ariaLabel, onHeightChange, maxWidth = 'min(1080px, 92vw)', hint, children
}: StudyActionBarProps) {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const update = () => {
      const h = el.offsetHeight
      onHeightChange?.(h)
      document.documentElement.style.setProperty('--toast-bottom', `${h + 12}px`)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--toast-bottom')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div
      ref={barRef}
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: BAR_Z_INDEX,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        fontFamily: pulseFonts.body,
      }}
    >
      <div style={{
        width: maxWidth, boxSizing: 'border-box',
        padding: '0 clamp(16px, 3vw, 36px)', pointerEvents: 'auto',
      }}>
        <PulseGlassRow dark={dark} radius={24} active activeTint={BAR_TINT} role="toolbar" aria-label={ariaLabel}>
          <div style={{ padding: '8px 10px' }}>
            {children}
            {hint && (
              <div className="kbd-hint" style={{
                textAlign: 'center', color: ON_GRADIENT_BOTTOM.muted,
                fontSize: 10, fontWeight: 600, letterSpacing: 0.3, marginTop: 4,
              }}>{hint}</div>
            )}
          </div>
        </PulseGlassRow>
      </div>
    </div>,
    document.body
  )
}
