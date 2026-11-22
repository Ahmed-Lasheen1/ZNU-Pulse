import type { ReactNode } from 'react'
import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import { glassHoverTint } from '@/shared/theme/liquidGlass'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'

export interface PillTab<T extends string> {
  id: T
  label: string
  Icon?: (props: { color: string; size?: number }) => ReactNode
  // Active tint color; defaults to the theme's cobalt.
  accent?: string
  // Count shown in a small badge; hidden when 0 or missing.
  badge?: number
}

// fixed: equal 150px tabs; auto: tabs sized to their label (wrap on narrow screens); compact: small text-only tabs.
export type PillTabSize = 'fixed' | 'auto' | 'compact'

interface PillTabsProps<T extends string> {
  dark: boolean
  tabs: readonly PillTab<T>[]
  active: T
  onSelect: (id: T) => void
  marginBottom: number
  size?: PillTabSize
}

// Centered row of glass tabs (Review: History/Flagged, Profile: Profile/Leaderboard, Pulse Check, Schedule).
export default function PillTabs<T extends string>({ dark, tabs, active, onSelect, marginBottom, size = 'fixed' }: PillTabsProps<T>) {
  const pt = getPulseTheme(dark)
  const hoverTint = glassHoverTint(dark)
  const fixed = size === 'fixed'
  const compact = size === 'compact'

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', gap: fixed ? 14 : 10,
      flexWrap: fixed ? undefined : 'wrap', marginBottom,
    }}>
      <style>{`
        @media (max-width: 400px) {
          .pill-tab-auto { padding: 10px 12px !important; font-size: 13px !important; gap: 6px !important; }
        }
      `}</style>
      {tabs.map(t => {
        const isActive = active === t.id
        const color = compact
          ? (isActive ? pt.cobalt : pt.sub)
          : (isActive ? (dark ? '#ffffff' : '#062B50') : pt.sub)
        const accent = t.accent ?? pt.cobalt
        const tint = `${accent}${t.accent ? '33' : '26'}`
        const base = compact
          ? { padding: '8px 18px', ...pulseType.small, fontWeight: 700 }
          : fixed
            ? { padding: '11px 0', ...pulseType.button, fontSize: 14 }
            : { padding: '10px 22px', whiteSpace: 'nowrap' as const, ...pulseType.button }

        return (
          <PulseGlassRow
            key={t.id} dark={dark} radius={999} active={isActive}
            activeTint={tint} hoverTint={hoverTint}
            onClick={() => onSelect(t.id)} role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(t.id) } }}
            style={fixed ? { textAlign: 'center', width: 150 } : undefined}
          >
            <div
              className={size === 'auto' ? 'pill-tab-auto' : undefined}
              style={{
                ...base, color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              {t.Icon && <t.Icon color={color} size={15} />} {t.label}
              {!!t.badge && t.badge > 0 && (
                <span style={{ background: pt.amber, color: dark ? '#0f172a' : '#ffffff', borderRadius: 999, padding: '0 7px', fontSize: 11, fontWeight: 800 }}>{t.badge}</span>
              )}
            </div>
          </PulseGlassRow>
        )
      })}
    </div>
  )
}
