import { getPulseTheme, pulseType } from '../../premiumTheme'
import PulseGlassRow from '../../components/pulse/PulseGlassRow'
import type { AdminIcon } from './adminTypes'

interface AdminPillProps {
  dark: boolean
  active: boolean
  label: string
  Icon: AdminIcon
  onSelect: () => void
}

export default function AdminPill({ dark, active, label, Icon, onSelect }: AdminPillProps) {
  const pt = getPulseTheme(dark)

  return (
    <PulseGlassRow
      dark={dark}
      radius={999}
      active={active}
      activeTint={`${pt.cobalt}26`}
      hoverTint={dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      style={{ flexShrink: 0 }}
    >
      <div style={{
        padding: '9px 16px', whiteSpace: 'nowrap', ...pulseType.button,
        color: active ? pt.cobalt : pt.sub, display: 'flex', alignItems: 'center', gap: 6
      }}>
        <Icon color={active ? pt.cobalt : pt.sub} size={14} /> {label}
      </div>
    </PulseGlassRow>
  )
}
