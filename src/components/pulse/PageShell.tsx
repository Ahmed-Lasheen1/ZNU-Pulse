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

// Shared full-page chrome used by every simple content page (Schedule,
// Checklist, FilesPage, AnonQuestions, Search, Review): the fixed
// PulseBackground, the `.pulse-wide` (or page-specific) container, and
// the "← Back" pill in its usual spot. Pages only supply their content.
export default function PageShell({
  dark, children, backFallback = '/', onBack,
  maxWidth, containerClassName = 'pulse-wide', containerStyle = {},
}: PageShellProps) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div
        className={containerClassName}
        style={{
          position: 'relative', zIndex: 1, padding: '24px 20px 100px',
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
