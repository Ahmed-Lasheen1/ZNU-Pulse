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
// The row never wraps: the text block shrinks and the action keeps its size.
export default function ActionCard({ dark, accent, icon, title, subtitle, action, children, padding = '22px 24px' }: ActionCardProps) {
  return (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding }}>
      <style>{`
        .action-card-row { display: flex; align-items: center; gap: 18px; }
        .action-card-icon {
          width: 60px; height: 60px; border-radius: 18px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .action-card-text { flex: 1; min-width: 0; }
        .action-card-title { overflow-wrap: anywhere; }
        .action-card-action { flex-shrink: 0; }
        @media (max-width: 480px) {
          .action-card-row { gap: 12px; }
          .action-card-icon { width: 46px; height: 46px; border-radius: 14px; }
          .action-card-icon svg { width: 22px; height: 22px; }
          .action-card-action button { padding: 10px 16px !important; font-size: 13px !important; }
        }
      `}</style>

      <div className="action-card-row" style={{ marginBottom: children ? 16 : 0 }}>
        <div className="action-card-icon" style={{ background: `${accent}22`, border: `1px solid ${accent}55` }}>
          {icon}
        </div>
        <div className="action-card-text">
          <h3 className="action-card-title" style={{ ...pulseType.sectionLabel, fontSize: 15, color: adaptColor(accent, dark), marginBottom: 6 }}>{title}</h3>
          {subtitle}
        </div>
        <div className="action-card-action">{action}</div>
      </div>
      {children}
    </LiquidGlassCard>
  )
}
