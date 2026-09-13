import type { ReactNode } from 'react'
import { getPulseTheme } from '../../premiumTheme'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'

interface AdminStatusCardProps {
  dark: boolean
  message: ReactNode
}

// Shared "Loading..." / "No X yet" card — every admin tab's list
// column showed this exact same wrapper (LiquidGlassCard, 40px
// padding, centered pt.sub text) for both its loading and empty
// states, just with different inner content.
export default function AdminStatusCard({ dark, message }: AdminStatusCardProps) {
  const pt = getPulseTheme(dark)
  return (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {message}
      </p>
    </LiquidGlassCard>
  )
}
