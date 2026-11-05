import type { CSSProperties, ReactNode } from 'react'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'

export const STUDY_CARD_MIN_HEIGHT = 'clamp(240px, 42vh, 420px)'
export const STUDY_CARD_TALL = 'clamp(320px, 58vh, 760px)'

interface StudyCardProps {
  dark: boolean
  children: ReactNode
  header?: ReactNode
  minHeight?: string
  style?: CSSProperties
}

// Glass card used for flashcard faces and MCQ questions: generous padding, centered content, optional tag row on top.
export default function StudyCard({ dark, children, header, minHeight = STUDY_CARD_MIN_HEIGHT, style }: StudyCardProps) {
  return (
    <LiquidGlassCard dark={dark} delay={0} style={{
      padding: 'clamp(22px, 4vw, 36px)', minHeight, height: '100%', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      ...style,
    }}>
      {header && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 14, flexShrink: 0 }}>
          {header}
        </div>
      )}
      {children}
    </LiquidGlassCard>
  )
}
