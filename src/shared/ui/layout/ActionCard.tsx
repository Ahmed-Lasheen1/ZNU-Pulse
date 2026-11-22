import type { ReactNode } from 'react'
import { pulseType } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'

interface ActionCardProps {
  dark: boolean
  // Accent of the icon tile and title.
  accent: string
  icon: ReactNode
  title: ReactNode
  subtitle: ReactNode
  // Button shown at the right (for example "Start →").
  action: ReactNode
  // Optional content under the row (for example a filter row).
  children?: ReactNode
  padding?: string
}

// Large card with an icon tile, title, subtitle and one action (Mock Exam, Simulator, Due Today).
export default function ActionCard({ dark, accent, icon, title, subtitle, action, children, padding = '22px 24px' }: ActionCardProps) {
  return (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: children ? 16 : 0 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 18, flexShrink: 0,
          background: `${accent}22`, border: `1px solid ${accent}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <h3 style={{ ...pulseType.sectionLabel, fontSize: 15, color: adaptColor(accent, dark), marginBottom: 6 }}>{title}</h3>
          {subtitle}
        </div>
        {action}
      </div>
      {children}
    </LiquidGlassCard>
  )
}
