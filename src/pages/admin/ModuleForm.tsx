import { useState } from 'react'
import { getPulseTheme } from '../../premiumTheme'
import IconPicker from '../../components/admin/IconPicker'
import AdminFormCard from './AdminFormCard'
import { inStyle as adminInStyle, fieldLabel } from './adminStyles'
import { useAdminEntityCrud } from './useAdminEntityCrud'
import { REQUIRED_FIELDS_MESSAGE } from './useAdminContext'
import type { AdminModule } from './adminTypes'

const DEFAULT_COLOR = '#38bdf8'
const DEFAULT_ICON = '📚'

interface ModuleFormProps {
  dark: boolean
  module: AdminModule | null
  modules: AdminModule[]
  showMessage: (message: string) => void
  onSaved: () => void
  onDone: () => void
}

export default function ModuleForm({ dark, module, modules, showMessage, onSaved, onDone }: ModuleFormProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const editing = !!module

  const [name, setName] = useState(module?.name ?? '')
  const [color, setColor] = useState(module?.color ?? DEFAULT_COLOR)
  const [icon, setIcon] = useState(module?.icon || DEFAULT_ICON)
  const [status, setStatus] = useState<AdminModule['status']>(module?.status ?? 'active')

  function resetForm() {
    setName('')
    setColor(DEFAULT_COLOR)
    setIcon(DEFAULT_ICON)
    setStatus('active')
    onDone()
  }

  const crud = useAdminEntityCrud({
    table: 'modules',
    label: 'Module',
    editingId: module?.id ?? null,
    buildPayload: () => ({ name, color, icon, status }),
    resetForm,
    refresh: onSaved,
    showMessage,
  })

  function save() {
    if (crud.saving) return
    if (!name) return showMessage(REQUIRED_FIELDS_MESSAGE)
    const duplicate = modules.some(m => m.name.trim().toLowerCase() === name.trim().toLowerCase() && m.id !== module?.id)
    if (duplicate) return showMessage('❌ A module with this name already exists')
    crud.save()
  }

  return (
    <AdminFormCard
      dark={dark}
      noun="Module"
      editing={editing}
      addLabel="Add Module"
      saving={crud.saving}
      onSave={save}
      onCancel={editing ? resetForm : undefined}
    >
      <input placeholder="Module name" value={name} onChange={e => setName(e.target.value)} style={inStyle} />
      <IconPicker value={icon} onChange={setIcon} inStyle={inStyle} pt={pt} />
      <div className="admin-form-row-2">
        <div>
          <label style={fieldLabel(pt)}>Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ ...inStyle, padding: 4, height: 48, marginBottom: 0 }} />
        </div>
        <div>
          <label style={fieldLabel(pt)}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as AdminModule['status'])} style={{ ...inStyle, marginBottom: 0 }}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
    </AdminFormCard>
  )
}
