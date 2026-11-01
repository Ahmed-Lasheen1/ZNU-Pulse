import type { ReactNode } from 'react'
import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import { glassHoverTint } from '@/shared/theme/liquidGlass'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'

export interface PillTab<T extends string> {
  id: T
  label: string
  Icon: (props: { color: string; size?: number }) => ReactNode
}

interface PillTabsProps<T extends string> {
  dark: boolean
  tabs: readonly PillTab<T>[]
  active: T
  onSelect: (id: T) => void
  marginBottom: number
}

// Centered row of fixed-width glass tabs (Review: History/Flagged, Profile: Profile/Leaderboard).
export default function PillTabs<T extends string>({ dark, tabs, active, onSelect, marginBottom }: PillTabsProps<T>) {
  const pt = getPulseTheme(dark)
  const hoverTint = glassHoverTint(dark)

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom }}>
      {tabs.map(t => {
        const isActive = active === t.id
        const color = isActive ? (dark ? '#ffffff' : '#062B50') : pt.sub
        return (
          <PulseGlassRow
            key={t.id} dark={dark} radius={999} active={isActive}
            activeTint={`${pt.cobalt}26`} hoverTint={hoverTint}
            onClick={() => onSelect(t.id)} role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(t.id) } }}
            style={{ textAlign: 'center', width: 150 }}
          >
            <div style={{ padding: '11px 0', ...pulseType.button, fontSize: 14, color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <t.Icon color={color} size={15} /> {t.label}
            </div>
          </PulseGlassRow>
        )
      })}
    </div>
  )
}
