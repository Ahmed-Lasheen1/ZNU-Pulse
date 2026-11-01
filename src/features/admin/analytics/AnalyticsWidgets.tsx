import type { ReactNode } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import type { AdminIcon } from '@/features/admin/common/adminTypes'

interface StatCardProps {
  dark: boolean
  label: string
  Icon: AdminIcon
  value: string | number
  color: string
  loading?: boolean
  delta?: number | null
  deltaSuffix?: string
}

export function StatCard({ dark, label, Icon, value, color, loading = false, delta, deltaSuffix = '' }: StatCardProps) {
  const pt = getPulseTheme(dark)

  return (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: '18px 20px', textAlign: 'center', flex: '1 1 150px' }}>
      <div style={{ color, fontWeight: 900, fontSize: 26 }}>{loading ? '…' : value}</div>
      <div style={{ color: pt.textMuted, fontSize: 12, fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <Icon color={pt.textMuted} size={12} /> {label}
      </div>
      {!loading && delta != null && (
        <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: delta > 0 ? pt.success : delta < 0 ? pt.danger : pt.textMuted }}>
          {delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '● '}{delta}{deltaSuffix} vs previous
        </div>
      )}
    </LiquidGlassCard>
  )
}

interface BarChartProps {
  dark: boolean
  values: number[]
  labels: string[]
  color: string
  labelEvery?: number
  height?: number
  highlightIndex?: number
}

export function BarChart({ dark, values, labels, color, labelEvery = 1, height = 120, highlightIndex }: BarChartProps) {
  const pt = getPulseTheme(dark)
  const max = Math.max(...values, 1)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
        {values.map((value, i) => (
          <div
            key={i}
            title={`${labels[i]}: ${value}`}
            style={{
              flex: 1, minWidth: 0, height: `${(value / max) * 100}%`, minHeight: 2, borderRadius: 3,
              background: color, opacity: highlightIndex === undefined || i === highlightIndex ? 1 : 0.5
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
        {labels.map((label, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
            <span style={{ color: pt.textMuted, fontSize: 10, whiteSpace: 'nowrap' }}>{i % labelEvery === 0 ? label : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ProgressRowProps {
  dark: boolean
  label: string
  value: number
  total: number
  color: string
}

export function ProgressRow({ dark, label, value, total, color }: ProgressRowProps) {
  const pt = getPulseTheme(dark)
  const percent = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <span style={{ color: pt.text, fontSize: 12, fontWeight: 600 }}>{label}</span>
        <span style={{ color: pt.textMuted, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{value} · {percent}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, overflow: 'hidden', background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
        <div style={{ height: '100%', width: `${percent}%`, borderRadius: 999, background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

interface RankRowProps {
  dark: boolean
  title: string
  subtitle?: ReactNode
  badge: string
  badgeColor: string
}

export function RankRow({ dark, title, subtitle, badge, badgeColor }: RankRowProps) {
  const pt = getPulseTheme(dark)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '10px 0', borderBottom: `1px solid ${pt.border}`
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: pt.text, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ color: pt.textMuted, fontSize: 11, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>{subtitle}</div>}
      </div>
      <div style={{
        background: `${badgeColor}22`, color: badgeColor, borderRadius: 20,
        padding: '4px 12px', fontWeight: 900, fontSize: 13, flexShrink: 0
      }}>{badge}</div>
    </div>
  )
}

interface SignalProps {
  dark: boolean
  tone: 'warn' | 'ok'
  children: ReactNode
}

export function Signal({ dark, tone, children }: SignalProps) {
  const pt = getPulseTheme(dark)
  const color = tone === 'warn' ? pt.amber : pt.success

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', color: pt.text, fontSize: 13, fontWeight: 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
      <span>{children}</span>
    </div>
  )
}
