import { useState } from 'react'
import { getPulseTheme } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import AdminSplitLayout from './AdminSplitLayout'
import AdminFormCard from './AdminFormCard'
import AdminRow from './AdminRow'
import AdminGroupedList from './AdminGroupedList'
import AdminDeleteDialog from './AdminDeleteDialog'
import { miniBtn, inStyle as adminInStyle, fieldLabel } from './adminStyles'
import { useAdminMessage } from './useAdminMessage'
import { useAdminEntityCrud } from './useAdminEntityCrud'
import { useConfirmDelete } from './useConfirmDelete'
import { useAdminList } from './useAdminList'
import { PICK_MODULE_MESSAGE, REQUIRED_FIELDS_MESSAGE } from './useAdminContext'
import { PlusIcon, TrashIcon, ConstructionIcon, CalendarDotIcon } from '../../components/ui/tool-icons'
import { ExamIcon } from '../../lib/medicalIcons'
import type { AdminModule, AdminContext } from './adminTypes'

interface ScheduleRow {
  id: string
  title: string
  url: string
  type: 'study' | 'exam'
  module_id: string
  dates?: string[] | null
}

interface DateEntry {
  id: string
  value: string
}

interface SchedulesTabProps {
  dark: boolean
  modules: AdminModule[]
  context: AdminContext
}

const createDateEntry = (value = ''): DateEntry => ({ id: crypto.randomUUID(), value })

export default function SchedulesTab({ dark, modules, context }: SchedulesTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message, showMessage } = useAdminMessage()
  const { rows: schedules, loading, error, refresh } = useAdminList<ScheduleRow>({ table: 'schedules', moduleId: context.moduleId })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState<ScheduleRow['type']>('study')
  const [dates, setDates] = useState<DateEntry[]>(() => [createDateEntry()])

  function editSchedule(schedule: ScheduleRow) {
    setEditingId(schedule.id)
    setTitle(schedule.title)
    setUrl(schedule.url)
    setType(schedule.type)
    setDates((schedule.dates && schedule.dates.length > 0 ? schedule.dates : ['']).map(value => createDateEntry(value)))
    context.setContext({ moduleId: schedule.module_id, subjectId: '', lessonId: '' })
  }

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setUrl('')
    setDates([createDateEntry()])
  }

  function updateDate(id: string, value: string) {
    setDates(prev => prev.map(d => d.id === id ? { ...d, value } : d))
  }

  function addDate() {
    setDates(prev => [...prev, createDateEntry()])
  }

  function removeDate(id: string) {
    setDates(prev => prev.length === 1 ? [createDateEntry()] : prev.filter(d => d.id !== id))
  }

  const crud = useAdminEntityCrud({
    table: 'schedules',
    label: 'Schedule',
    editingId,
    buildPayload: () => {
      const cleaned = dates.map(d => d.value.trim()).filter(Boolean)
      return {
        title,
        url,
        type,
        module_id: context.moduleId,
        dates: type === 'exam' && cleaned.length > 0 ? cleaned : null,
      }
    },
    resetForm,
    refresh,
    showMessage,
  })
  const del = useConfirmDelete(crud.remove)

  function saveSchedule() {
    if (crud.saving) return
    if (!context.moduleId) return showMessage(PICK_MODULE_MESSAGE)
    if (!title || !url) return showMessage(REQUIRED_FIELDS_MESSAGE)
    crud.save()
  }

  const form = (
    <AdminFormCard
      dark={dark}
      noun="Schedule"
      editing={!!editingId}
      addLabel="Add Schedule"
      saving={crud.saving}
      onSave={saveSchedule}
      onCancel={editingId ? resetForm : undefined}
    >
      <input placeholder="Title (e.g. Week 1)" value={title} onChange={e => setTitle(e.target.value)} style={inStyle} />
      <input placeholder="Image URL (Google Drive)" value={url} onChange={e => setUrl(e.target.value)} style={inStyle} />

      <label style={fieldLabel(pt)}>Type</label>
      <select value={type} onChange={e => setType(e.target.value as ScheduleRow['type'])} style={inStyle}>
        <option value="study">Study Schedule</option>
        <option value="exam">Exam Schedule</option>
      </select>

      {type === 'exam' && (
        <>
          <label style={fieldLabel(pt)}>Exam Date(s) (for reminder notifications)</label>
          {dates.map(d => (
            <div key={d.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="date"
                value={d.value}
                onChange={e => updateDate(d.id, e.target.value)}
                style={{ ...inStyle, marginBottom: 0, flex: 1 }}
              />
              <button onClick={() => removeDate(d.id)} aria-label="Remove this date" style={miniBtn(pt.danger)}>
                <TrashIcon color={pt.danger} size={12} />
              </button>
            </div>
          ))}
          <button onClick={addDate} style={{ ...miniBtn(pt.sub), width: '100%', justifyContent: 'center', borderStyle: 'dashed', marginBottom: 12 }}>
            <PlusIcon color={pt.sub} size={11} /> Add Another Exam Date
          </button>
        </>
      )}
    </AdminFormCard>
  )

  const list = (
    <AdminGroupedList
      dark={dark}
      modules={modules}
      items={schedules}
      moduleOf={s => s.module_id}
      loading={loading}
      error={error}
      noun="schedules"
      emptyMessage={<><ConstructionIcon color={pt.sub} size={14} /> No schedules yet — add one on the left</>}
      renderItem={s => (
        <AdminRow
          key={s.id}
          dark={dark}
          noun="schedule"
          label={s.title}
          active={editingId === s.id}
          onEdit={() => editSchedule(s)}
          onDelete={() => del.requestDelete(s.id)}
        >
          {s.type === 'exam' ? <ExamIcon color={pt.text} size={14} /> : <CalendarDotIcon color={pt.text} size={14} />}
          <span style={{ color: pt.text, fontWeight: 600 }}>{s.title}</span>
          <span style={{ color: pt.textMuted, fontSize: 12 }}>
            · {s.type}{s.dates && s.dates.length > 0 ? ` · ${s.dates.slice().sort().join(', ')}` : ''}
          </span>
        </AdminRow>
      )}
    />
  )

  return (
    <div>
      <InlineMessage message={message} />
      <AdminSplitLayout form={form} list={list} />
      <AdminDeleteDialog dark={dark} noun="schedule" del={del} />
    </div>
  )
}
