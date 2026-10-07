import type { ReactNode } from 'react'
import { getPulseTheme } from '../../premiumTheme'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import { EditIcon, TrashIcon } from '../../components/ui/tool-icons'
import { miniBtn } from './adminStyles'

interface AdminRowProps {
  dark: boolean
  noun: string
  label: string
  active?: boolean
  actions?: ReactNode
  onEdit: () => void
  onDelete: () => void
  children: ReactNode
}

export default function AdminRow({ dark, noun, label, active = false, actions, onEdit, onDelete, children }: AdminRowProps) {
  const pt = getPulseTheme(dark)

  return (
    <LiquidGlassCard dark={dark} delay={0} style={{
      padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: 10,
      boxShadow: active ? `inset 0 0 0 2px ${pt.cobalt}` : undefined
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, minWidth: 0, flex: 1 }}>
        {children}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {actions}
        <button onClick={onEdit} aria-label={`Edit ${noun}: ${label}`} style={miniBtn(pt.cobalt)}>
          <EditIcon color={pt.cobalt} size={12} />
        </button>
        <button onClick={onDelete} aria-label={`Delete ${noun}: ${label}`} style={miniBtn(pt.danger)}>
          <TrashIcon color={pt.danger} size={12} />
        </button>
      </div>
    </LiquidGlassCard>
  )
}
