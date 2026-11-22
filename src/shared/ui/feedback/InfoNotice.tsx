import type { ReactNode } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import { LightbulbIcon, WarningIcon } from '@/shared/icons/tool-icons'

interface InfoNoticeProps {
  dark: boolean
  children: ReactNode
  // info: cobalt tip; warning: amber caution.
  tone?: 'info' | 'warning'
  Icon?: (props: { color: string; size?: number }) => JSX.Element
  marginBottom?: number
}

// Centered one-line notice card (for example "Sign in to keep this across devices").
export default function InfoNotice({ dark, children, tone = 'info', Icon, marginBottom = 0 }: InfoNoticeProps) {
  const pt = getPulseTheme(dark)
  const color = tone === 'warning' ? pt.amber : pt.cobalt
  const NoticeIcon = Icon ?? (tone === 'warning' ? WarningIcon : LightbulbIcon)

  return (
    <div style={{ marginBottom }}>
      <LiquidGlassCard dark={dark} delay={0} style={{ padding: '12px 18px', textAlign: 'center' }}>
        <span style={{ color, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <NoticeIcon color={color} size={14} /> {children}
        </span>
      </LiquidGlassCard>
    </div>
  )
}
