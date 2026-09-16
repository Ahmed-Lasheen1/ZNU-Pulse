// src/components/pulse/PageShell.tsx
import type { ReactNode, CSSProperties } from 'react'
import PulseBackground from './PulseBackground'
import BackButton from './BackButton'
import { pulseFonts } from '../../premiumTheme'

interface PageShellProps {
  dark: boolean
  children: ReactNode
  backFallback?: string
  onBack?: () => void
  maxWidth?: number
  containerClassName?: string
  containerStyle?: CSSProperties
}

// Shared full-page chrome (background + container + "← Back" pill)
// used by Schedule, Checklist, FilesPage, AnonQuestions, Search, and
// Review — pages only supply their content.
export default function PageShell({
  dark, children, backFallback = '/', onBack,
  maxWidth, containerClassName = 'pulse-wide', containerStyle = {},
}: PageShellProps) {
  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <PulseBackground />
      <div
        className={containerClassName}
        style={{
          position: 'relative', zIndex: 1,
          // AUDIT FIX (iOS safe area): the bottom edge of this
          // container is the actual scrollable content boundary on
          // every page that uses PageShell. A bare 100px doesn't
          // account for a transparent Safari bottom bar or the
          // home-indicator inset on notched iPhones, so the last card
          // could sit partly behind it. Adding the inset on top of
          // the existing 100px preserves the current spacing
          // everywhere the inset is 0 (desktop, older devices).
          padding: '24px 20px calc(100px + env(safe-area-inset-bottom))',
          fontFamily: pulseFonts.body,
          ...(maxWidth ? { maxWidth, margin: '0 auto' } : {}),
          ...containerStyle,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback={backFallback} onClick={onBack} />
        </div>
        {children}
      </div>
    </div>
  )
}
