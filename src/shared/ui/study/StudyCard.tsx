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
  // Optional accent for the decorative frame; omitted = plain card.
  accent?: string
  // Applied to the scrolling content area.
  style?: CSSProperties
}

// Opaque study card with a faint accent frame; content scrolls inside while the decoration stays put.
export default function StudyCard({ dark, children, header, height, minHeight, accent, style }: StudyCardProps) {
  const pt = getPulseTheme(dark)

  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
      height, minHeight, overflow: 'hidden',
      background: pt.surface, border: `1px solid ${pt.border}`, borderRadius: 18,
      boxShadow: dark ? '0 10px 30px rgba(0,0,0,0.35)' : '0 10px 30px rgba(37,60,97,0.18)',
    }}>
      {accent && (
        <>
          <div aria-hidden style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse 70% 55% at 0% 0%, ${accent}1a, transparent 70%)`,
          }} />
          <div aria-hidden style={{
            position: 'absolute', inset: 8, borderRadius: 12, pointerEvents: 'none',
            border: `1px solid ${accent}33`,
          }} />
          <div aria-hidden style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 4, pointerEvents: 'none',
            background: `linear-gradient(90deg, ${accent}, ${accent}55 55%, transparent)`,
          }} />
        </>
      )}

      <div style={{
        position: 'relative', flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch',
        padding: 'clamp(22px, 4vw, 36px)',
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
    </div>
  )
}
