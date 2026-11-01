import type { ReactNode, CSSProperties } from 'react'
import { getPulseTheme } from '../../premiumTheme'
import LiquidGlassCard from '../ui/liquid-glass-card'

interface EmptyStateProps {
  dark: boolean
  icon?: ReactNode
  message: ReactNode
  style?: CSSProperties
}

// Shared "nothing here yet" card — the same icon + centered-text glass
// card repeated across Schedule, AnonQuestions, Search, and Review.
// `style` merges onto the card itself for the rare cases that need a
// different padding or extra margin.
export default function EmptyState({ dark, icon, message, style }: EmptyStateProps) {
  const pt = getPulseTheme(dark)
  return (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center', ...style }}>
      <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {icon}{message}
      </p>
    </LiquidGlassCard>
  )
}
