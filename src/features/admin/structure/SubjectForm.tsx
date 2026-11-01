import { useState } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import IconPicker from '@/features/admin/common/IconPicker'
import AdminFormCard from '@/features/admin/common/AdminFormCard'
import { inStyle as adminInStyle, fieldLabel } from '@/features/admin/common/adminStyles'
import { useAdminEntityCrud } from '@/features/admin/common/useAdminEntityCrud'
import { REQUIRED_FIELDS_MESSAGE } from '@/features/admin/common/useAdminContext'
import { SUBJECT_DEFAULTS, normalizeName } from '@/features/admin/common/adminHelpers'
import type { AdminModule, AdminSubject } from '@/features/admin/common/adminTypes'

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
  const [type, setType] = useState<string>(subject?.type || SUBJECT_DEFAULTS.type)
  const [icon, setIcon] = useState<string>(subject?.icon || SUBJECT_DEFAULTS.icon)
  const [color, setColor] = useState<string>(subject?.color || SUBJECT_DEFAULTS.color)

  function resetForm() {
    setName('')
    setType(SUBJECT_DEFAULTS.type)
    setIcon(SUBJECT_DEFAULTS.icon)
    setColor(SUBJECT_DEFAULTS.color)
    onDone()
  }

  const crud = useAdminEntityCrud({
    table: 'subjects',
    label: 'Subject',
    editingId: subject?.id ?? null,
    buildPayload: () => ({ name, module_id: module.id, type, icon: icon || SUBJECT_DEFAULTS.icon, color: color || SUBJECT_DEFAULTS.color }),
    resetForm,
    refresh: onSaved,
    showMessage,
  })

  function save() {
    if (crud.saving) return
    if (!name) return showMessage(REQUIRED_FIELDS_MESSAGE)
    const duplicate = subjects.some(s => s.module_id === module.id && s.id !== subject?.id && normalizeName(s.name) === normalizeName(name))
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
