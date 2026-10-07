import type { ReactNode } from 'react'
import { getPulseTheme } from '../../premiumTheme'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import { EditIcon, PlusIcon } from '../../components/ui/tool-icons'
import { cancelBtnStyle, submitBtnStyle } from './adminStyles'
import type { AdminIcon } from './adminTypes'

interface AdminFormCardProps {
  dark: boolean
  title?: string
  noun?: string
  Icon?: AdminIcon
  description?: string
  headerAction?: ReactNode
  children?: ReactNode
  editing?: boolean
  addLabel?: ReactNode
  savingLabel?: string
  cancelLabel?: string
  saving?: boolean
  disabled?: boolean
  onSave?: () => void
  onCancel?: () => void
}

export default function AdminFormCard({
  dark, title, noun, Icon, description, headerAction, children,
  editing = false, addLabel = 'Save', savingLabel = 'Saving...', cancelLabel = 'Cancel',
  saving = false, disabled = false, onSave, onCancel
}: AdminFormCardProps) {
  const pt = getPulseTheme(dark)
  const heading = title ?? `${editing ? 'Edit' : 'Add'} ${noun}`
  const HeadingIcon = Icon ?? (editing ? EditIcon : PlusIcon)
  const blocked = saving || disabled

  return (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8, marginBottom: description ? 8 : 16
      }}>
        <h3 style={{ color: pt.cobalt, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
          <HeadingIcon color={pt.cobalt} size={17} /> {heading}
        </h3>
        {headerAction}
      </div>

      {description && <p style={{ color: pt.textMuted, fontSize: 13, marginBottom: 16 }}>{description}</p>}

      {children && <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>}

      {onSave && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onSave} disabled={blocked} style={submitBtnStyle(pt, dark, blocked)}>
            {saving ? savingLabel : editing ? 'Save Changes' : addLabel}
          </button>
          {onCancel && (
            <button onClick={onCancel} disabled={saving} style={cancelBtnStyle(pt, dark)}>{cancelLabel}</button>
          )}
        </div>
      )}
    </LiquidGlassCard>
  )
}
