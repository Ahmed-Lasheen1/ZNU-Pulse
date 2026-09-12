import { getPulseTheme, pulseFonts } from '../premiumTheme'
import { ModuleIcon } from '../lib/medicalIcons'
import PulseGlassRow from './pulse/PulseGlassRow'

export interface TabRowItem {
  value: string
  label: string
  // Emoji or "icon:<key>" string, resolved via ModuleIcon.
  icon?: string | null
  // Real icon component — takes precedence over `icon` when both are set.
  Icon?: (props: { color: string; size?: number }) => JSX.Element
  // Per-item color; falls back to `accentColor` when unset.
  color?: string
  completed?: boolean
}

interface TabRowProps {
  items: TabRowItem[]
  active: string | null
  onSelect: (value: string) => void
  dark: boolean
  accentColor?: string
  style?: React.CSSProperties
}

// Shared row of glass pills for tab-style selection — module switching,
// exam-stage filters, and subject filters across MCQ/Summaries/Checklist/
// Schedule/FilesPage all use this instead of separately hand-rolled rows.
export default function TabRow({ items, active, onSelect, dark, accentColor, style }: TabRowProps) {
  const pt = getPulseTheme(dark)
  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'

  return (
    <div style={{
      display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16,
      paddingBottom: 4, paddingRight: 8, scrollSnapType: 'x proximity',
      WebkitOverflowScrolling: 'touch',
      ...style,
    }}>
      {items.map(item => {
        const isActive = active === item.value
        const color = item.color || accentColor || pt.cobalt
        return (
          <PulseGlassRow
            key={item.value}
            dark={dark}
            radius={999}
            active={isActive}
            activeTint={`${color}26`}
            hoverTint={hoverTint}
            onClick={() => onSelect(item.value)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(item.value) } }}
            aria-label={item.label}
            style={{ flexShrink: 0, scrollSnapAlign: 'start' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', whiteSpace: 'nowrap',
              fontFamily: pulseFonts.body, fontWeight: 700, fontSize: 13,
              color: isActive ? color : pt.sub,
            }}>
              {item.Icon ? (
                <span style={{ display: 'inline-flex' }}>
                  <item.Icon color={isActive ? color : pt.sub} size={14} />
                </span>
              ) : item.icon && (
                <span style={{ display: 'inline-flex' }}>
                  <ModuleIcon value={item.icon} size={14} color={isActive ? color : pt.sub} />
                </span>
              )}
              {item.label}
              {item.completed && <span style={{ fontSize: 10, marginLeft: 2, color: pt.faint }}>✓</span>}
            </div>
          </PulseGlassRow>
        )
      })}
    </div>
  )
}
