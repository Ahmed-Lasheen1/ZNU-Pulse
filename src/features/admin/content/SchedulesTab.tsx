import { useState, useEffect } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import InlineMessage from '@/shared/ui/feedback/InlineMessage'
import AdminSplitLayout from '@/features/admin/common/AdminSplitLayout'
import AdminFormCard from '@/features/admin/common/AdminFormCard'
import AdminRow from '@/features/admin/common/AdminRow'
import AdminGroupedList from '@/features/admin/common/AdminGroupedList'
import AdminDeleteDialog from '@/features/admin/common/AdminDeleteDialog'
import { miniBtn, inStyle as adminInStyle, fieldLabel } from '@/features/admin/common/adminStyles'
import { useAdminMessage } from '@/features/admin/common/useAdminMessage'
import { useAdminEntityCrud } from '@/features/admin/common/useAdminEntityCrud'
import { useConfirmDelete } from '@/features/admin/common/useConfirmDelete'
import { useAdminList } from '@/features/admin/common/useAdminList'
import { PICK_MODULE_MESSAGE, REQUIRED_FIELDS_MESSAGE } from '@/features/admin/common/useAdminContext'
import { fetchLessonsForModule } from '@/services/content/lessons'
import { plural } from '@/shared/utils/format'
import { PlusIcon, TrashIcon, ConstructionIcon, CalendarDotIcon } from '@/shared/icons/tool-icons'
import { ExamIcon } from '@/shared/icons/medicalIcons'
import type { AdminModule, AdminLesson, AdminContext } from '@/features/admin/common/adminTypes'
import type { PlanLink, PlanLinkKind } from '@/features/tools/schedule/types'

interface PlanItemRow {
  id: string
  date: string | null
  text: string
  link?: PlanLink | null
}

interface ScheduleRow {
  id: string
  title: string
  url: string | null
  type: 'study' | 'exam'
  module_id: string
  dates?: string[] | null
  items?: PlanItemRow[] | null
}

interface DateEntry {
  id: string
  value: string
}

interface PlanDraft {
  id: string
  date: string
  text: string
  linkKind: PlanLinkKind | ''
  lessonId: string
}

interface SchedulesTabProps {
  dark: boolean
  modules: AdminModule[]
  context: AdminContext
}

// Creates an empty (or pre-filled) exam date field.
const createDateEntry = (value = ''): DateEntry => ({ id: crypto.randomUUID(), value })

// Creates an empty (or pre-filled) study plan item.
const createPlanDraft = (item?: Partial<PlanItemRow>): PlanDraft => ({
  id: item?.id || crypto.randomUUID(),
  date: item?.date || '',
  text: item?.text || '',
  linkKind: item?.link?.kind || '',
  lessonId: item?.link?.lesson_id || '',
})

// Admin tab for adding, editing and deleting study plans and exam schedules; an image link is optional.
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
  const [plan, setPlan] = useState<PlanDraft[]>(() => [createPlanDraft()])
  const [lessons, setLessons] = useState<AdminLesson[]>([])

  // Loads the selected module's lessons (shared cache) for the plan item link pickers.
  useEffect(() => {
    if (!context.moduleId) { setLessons([]); return }
    let ignore = false
    fetchLessonsForModule(context.moduleId).then(({ lessons: list }: { lessons: AdminLesson[] }) => { if (!ignore) setLessons(list) })
    return () => { ignore = true }
  }, [context.moduleId])

  // Non-empty exam dates from the form.
  const cleanDates = () => dates.map(d => d.value.trim()).filter(Boolean)

  // Plan items with text from the form (dates are optional); a link is kept only when both its tool and lesson are chosen.
  const cleanPlan = (): PlanItemRow[] =>
    plan
      .map(p => {
        const item: PlanItemRow = { id: p.id, date: p.date || null, text: p.text.trim() }
        if (p.linkKind && p.lessonId) item.link = { kind: p.linkKind, lesson_id: p.lessonId }
        return item
      })
      .filter(p => p.text)

  // True when a plan item picked a tool but no lesson, or the other way round.
  const hasHalfLink = () => plan.some(p => p.text.trim() && !!p.linkKind !== !!p.lessonId)

  // Loads a schedule into the form and moves the context bar to its module.
  function editSchedule(schedule: ScheduleRow) {
    setEditingId(schedule.id)
    setTitle(schedule.title)
    setUrl(schedule.url || '')
    setType(schedule.type)
    setDates((schedule.dates && schedule.dates.length > 0 ? schedule.dates : ['']).map(value => createDateEntry(value)))
    setPlan(schedule.items && schedule.items.length > 0 ? schedule.items.map(createPlanDraft) : [createPlanDraft()])
    context.setContext({ moduleId: schedule.module_id, subjectId: '', lessonId: '' })
  }

  // Clears the form after a save or cancel.
  function resetForm() {
    setEditingId(null)
    setTitle('')
    setUrl('')
    setDates([createDateEntry()])
    setPlan([createPlanDraft()])
  }

  // Updates one exam date field.
  function updateDate(id: string, value: string) {
    setDates(prev => prev.map(d => d.id === id ? { ...d, value } : d))
  }

  // Adds another exam date field.
  function addDate() {
    setDates(prev => [...prev, createDateEntry()])
  }

  // Removes an exam date field (the last one is just cleared).
  function removeDate(id: string) {
    setDates(prev => prev.length === 1 ? [createDateEntry()] : prev.filter(d => d.id !== id))
  }

  // Updates one field of a plan item.
  function updatePlan(id: string, changes: Partial<PlanDraft>) {
    setPlan(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
  }

  // Adds another plan item.
  function addPlanItem() {
    setPlan(prev => [...prev, createPlanDraft()])
  }

  // Removes a plan item (the last one is just cleared).
  function removePlanItem(id: string) {
    setPlan(prev => prev.length === 1 ? [createPlanDraft()] : prev.filter(p => p.id !== id))
  }

  const crud = useAdminEntityCrud({
    table: 'schedules',
    label: 'Schedule',
    editingId,
    buildPayload: () => {
      const cleanedDates = cleanDates()
      const cleanedPlan = cleanPlan()
      return {
        title: title.trim(),
        url: url.trim() || null,
        type,
        module_id: context.moduleId,
        dates: type === 'exam' && cleanedDates.length > 0 ? cleanedDates : null,
        items: type === 'study' && cleanedPlan.length > 0 ? cleanedPlan : null,
      }
    },
    resetForm,
    refresh,
    showMessage,
  })
  const del = useConfirmDelete(crud.remove)

  // Validates the form (a title plus an image link, plan items or exam dates) and saves.
  function saveSchedule() {
    if (crud.saving) return
    if (!context.moduleId) return showMessage(PICK_MODULE_MESSAGE)
    if (!title.trim()) return showMessage(REQUIRED_FIELDS_MESSAGE)
    const hasContent = !!url.trim() || (type === 'exam' ? cleanDates().length > 0 : cleanPlan().length > 0)
    if (!hasContent) {
      return showMessage(type === 'exam' ? '❌ Add an exam date or an image link' : '❌ Add at least one plan item or an image link')
    }
    if (type === 'study' && hasHalfLink()) return showMessage('❌ Choose both a tool and a lesson for linked plan items')
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
      <input placeholder={type === 'study' ? 'Title (e.g. Week 1 plan)' : 'Title (e.g. Midterm)'} value={title} onChange={e => setTitle(e.target.value)} style={inStyle} />

      <label style={fieldLabel(pt)}>Type</label>
      <select value={type} onChange={e => setType(e.target.value as ScheduleRow['type'])} style={inStyle}>
        <option value="study">Study Plan</option>
        <option value="exam">Exam Schedule</option>
      </select>

      {type === 'study' && (
        <>
          <label style={fieldLabel(pt)}>Plan items (date and link are optional)</label>
          {plan.map(p => (
            <div key={p.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <input
                  type="date"
                  value={p.date}
                  onChange={e => updatePlan(p.id, { date: e.target.value })}
                  aria-label="Plan item date"
                  style={{ ...inStyle, marginBottom: 0, flex: '0 0 150px', minWidth: 0 }}
                />
                <input
                  dir="auto"
                  placeholder="e.g. Review lecture 3"
                  value={p.text}
                  onChange={e => updatePlan(p.id, { text: e.target.value })}
                  style={{ ...inStyle, marginBottom: 0, flex: '1 1 180px', minWidth: 0 }}
                />
                <button onClick={() => removePlanItem(p.id)} aria-label="Remove this plan item" style={miniBtn(pt.danger)}>
                  <TrashIcon color={pt.danger} size={12} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={p.linkKind}
                  onChange={e => updatePlan(p.id, { linkKind: e.target.value as PlanDraft['linkKind'] })}
                  aria-label="Study tool to open for this item"
                  style={{ ...inStyle, marginBottom: 0, flex: '0 0 170px', minWidth: 0 }}
                >
                  <option value="">No link</option>
                  <option value="practice">Practice questions</option>
                  <option value="flashcards">Flashcards</option>
                </select>
                <select
                  value={p.lessonId}
                  onChange={e => updatePlan(p.id, { lessonId: e.target.value })}
                  disabled={!p.linkKind}
                  aria-label="Lesson to open for this item"
                  style={{ ...inStyle, marginBottom: 0, flex: '1 1 180px', minWidth: 0, opacity: p.linkKind ? 1 : 0.5 }}
                >
                  <option value="">Choose a lesson</option>
                  {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
            </div>
          ))}
          <button onClick={addPlanItem} style={{ ...miniBtn(pt.sub), width: '100%', justifyContent: 'center', borderStyle: 'dashed', marginBottom: 12 }}>
            <PlusIcon color={pt.sub} size={11} /> Add Plan Item
          </button>
        </>
      )}

      {type === 'exam' && (
        <>
          <label style={fieldLabel(pt)}>Exam Date(s) (also used for reminder notifications and the Home countdown)</label>
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

      <input placeholder="Image URL (Google Drive) — optional" value={url} onChange={e => setUrl(e.target.value)} style={inStyle} />
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
            · {s.type}
            {s.items && s.items.length > 0 ? ` · ${plural(s.items.length, 'item')}` : ''}
            {s.dates && s.dates.length > 0 ? ` · ${s.dates.slice().sort().join(', ')}` : ''}
            {!s.url ? ' · no image' : ''}
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
