import type { CSSProperties, ReactNode } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'

// Fixed card size used by flashcards; longer text scrolls inside the card.
export const STUDY_CARD_HEIGHT = 'clamp(280px, 46vh, 460px)'
// Minimum height used by MCQ, where the card grows with the options.
export const STUDY_CARD_TALL = 'clamp(320px, 58vh, 760px)'

interface StudyCardProps {
  dark: boolean
  children: ReactNode
  header?: ReactNode
  height?: string
  minHeight?: string
  style?: CSSProperties
}

// Opaque study card: centered content that scrolls inside when it doesn't fit, with an optional tag row on top.
export default function StudyCard({ dark, children, header, height, minHeight, style }: StudyCardProps) {
  const pt = getPulseTheme(dark)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
      height, minHeight,
      overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch',
      padding: 'clamp(22px, 4vw, 36px)',
      background: pt.surface, border: `1px solid ${pt.border}`, borderRadius: 18,
      boxShadow: dark ? '0 10px 30px rgba(0,0,0,0.35)' : '0 10px 30px rgba(37,60,97,0.18)',
      ...style,
    }}>
      {/* Auto margins center the content when it fits and let it scroll from the top when it doesn't. */}
      <div style={{ margin: 'auto 0', width: '100%' }}>
        {header && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            {header}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
