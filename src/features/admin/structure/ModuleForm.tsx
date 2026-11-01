import { useState } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import IconPicker from '@/features/admin/common/IconPicker'
import AdminFormCard from '@/features/admin/common/AdminFormCard'
import { inStyle as adminInStyle, fieldLabel } from '@/features/admin/common/adminStyles'
import { useAdminEntityCrud } from '@/features/admin/common/useAdminEntityCrud'
import { REQUIRED_FIELDS_MESSAGE } from '@/features/admin/common/useAdminContext'
import { MODULE_DEFAULTS, normalizeName } from '@/features/admin/common/adminHelpers'
import type { AdminModule } from '@/features/admin/common/adminTypes'

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
  const [color, setColor] = useState(module?.color ?? MODULE_DEFAULTS.color)
  const [icon, setIcon] = useState(module?.icon || MODULE_DEFAULTS.icon)
  const [status, setStatus] = useState<AdminModule['status']>(module?.status ?? MODULE_DEFAULTS.status)

  function resetForm() {
    setName('')
    setColor(MODULE_DEFAULTS.color)
    setIcon(MODULE_DEFAULTS.icon)
    setStatus(MODULE_DEFAULTS.status)
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
    const duplicate = modules.some(m => normalizeName(m.name) === normalizeName(name) && m.id !== module?.id)
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
