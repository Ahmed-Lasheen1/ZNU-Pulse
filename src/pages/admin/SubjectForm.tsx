import { useState } from 'react'
import { getPulseTheme } from '../../premiumTheme'
import IconPicker from '../../components/admin/IconPicker'
import AdminFormCard from './AdminFormCard'
import { inStyle as adminInStyle, fieldLabel } from './adminStyles'
import { useAdminEntityCrud } from './useAdminEntityCrud'
import { REQUIRED_FIELDS_MESSAGE } from './useAdminContext'
import type { AdminModule, AdminSubject } from './adminTypes'

const DEFAULT_ICON = '📖'
const DEFAULT_COLOR = '#34d399'
const DEFAULT_TYPE = 'both'

interface SubjectFormProps {
  dark: boolean
  subject: AdminSubject | null
  module: AdminModule
  subjects: AdminSubject[]
  showMessage: (message: string) => void
  onSaved: () => void
  onDone: () => void
}

export default function SubjectForm({ dark, subject, module, subjects, showMessage, onSaved, onDone }: SubjectFormProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const editing = !!subject

  const [name, setName] = useState(subject?.name ?? '')
  const [type, setType] = useState(subject?.type || DEFAULT_TYPE)
  const [icon, setIcon] = useState(subject?.icon || DEFAULT_ICON)
  const [color, setColor] = useState(subject?.color || DEFAULT_COLOR)

  function resetForm() {
    setName('')
    setType(DEFAULT_TYPE)
    setIcon(DEFAULT_ICON)
    setColor(DEFAULT_COLOR)
    onDone()
  }

  const crud = useAdminEntityCrud({
    table: 'subjects',
    label: 'Subject',
    editingId: subject?.id ?? null,
    buildPayload: () => ({ name, module_id: module.id, type, icon: icon || DEFAULT_ICON, color: color || DEFAULT_COLOR }),
    resetForm,
    refresh: onSaved,
    showMessage,
  })

  function save() {
    if (crud.saving) return
    if (!name) return showMessage(REQUIRED_FIELDS_MESSAGE)
    const duplicate = subjects.some(s => s.module_id === module.id && s.id !== subject?.id && s.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (duplicate) return showMessage('❌ This subject already exists in that module')
    crud.save()
  }

  return (
    <AdminFormCard
      dark={dark}
      noun="Subject"
      description={`In ${module.name}`}
      editing={editing}
      addLabel="Add Subject"
      saving={crud.saving}
      onSave={save}
      onCancel={editing ? resetForm : undefined}
    >
      <input placeholder="Subject name" value={name} onChange={e => setName(e.target.value)} style={inStyle} />
      <IconPicker value={icon} onChange={setIcon} inStyle={inStyle} pt={pt} />
      <div className="admin-form-row-2">
        <div>
          <label style={fieldLabel(pt)}>Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ ...inStyle, padding: 4, height: 48, marginBottom: 0 }} />
        </div>
        <div>
          <label style={fieldLabel(pt)}>Type</label>
          <select value={type} onChange={e => setType(e.target.value)} style={{ ...inStyle, marginBottom: 0 }}>
            <option value="both">Theory + Practical</option>
            <option value="theory">Theory Only</option>
            <option value="practical">Practical Only</option>
          </select>
        </div>
      </div>
    </AdminFormCard>
  )
}
