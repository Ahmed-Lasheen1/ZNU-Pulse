import type { ReactNode } from 'react'
import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'

interface HomeNoticeCardProps {
  dark: boolean
  accent: string
  Icon: (props: { color: string; size?: number }) => JSX.Element
  title: ReactNode
  body?: ReactNode
  // Short pill on the right, e.g. a countdown. Replaces the arrow when set.
  badge?: string
  // Lets long text (announcements) wrap instead of truncating to one line.
  multiline?: boolean
  onClick?: () => void
  delay: number
  instant: boolean
}

// Shared card for Home notices: icon, title, optional body and an optional badge or arrow.
export default function HomeNoticeCard({
  dark, accent, Icon, title, body, badge, multiline = false, onClick, delay, instant,
}: HomeNoticeCardProps) {
  const pt = getPulseTheme(dark)
  const clampStyle = multiline
    ? { wordBreak: 'break-word' as const }
    : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }

  return (
    <LiquidGlassCard
      dark={dark}
      delay={delay}
      instant={instant}
      onClick={onClick}
      style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon color={accent} size={18} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...pulseType.cardTitle, fontSize: 14, color: pt.textPrimary, ...clampStyle }}>
          {title}
        </div>
        {body && (
          <div style={{ ...pulseType.small, fontSize: 11, color: pt.textMuted, marginTop: 2, ...clampStyle }}>
            {body}
          </div>
        )}
      </div>

      {badge ? (
        <span style={{
          background: `${accent}22`, color: accent, borderRadius: 999,
          padding: '3px 11px', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0,
        }}>{badge}</span>
      ) : onClick ? (
        <span aria-hidden style={{ color: pt.textMuted, fontSize: 16, flexShrink: 0 }}>→</span>
      ) : null}
    </LiquidGlassCard>
  )
}
