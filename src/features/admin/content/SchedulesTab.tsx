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
import { fetchSubjectsForModule } from '@/services/content/subjects'
import { plural } from '@/shared/utils/format'
import { PlusIcon, TrashIcon, ConstructionIcon, CalendarDotIcon } from '@/shared/icons/tool-icons'
import { ExamIcon } from '@/shared/icons/medicalIcons'
import { PLAN_TOOL_ORDER, PLAN_TOOL_META, planToolColor, itemTools, itemLessonId } from '@/features/tools/schedule/planItems'
import type { AdminModule, AdminSubject, AdminLesson, AdminContext } from '@/features/admin/common/adminTypes'
import type { PlanItem, PlanLinkKind } from '@/features/tools/schedule/types'

interface ScheduleRow {
  id: string
  title: string
  url: string | null
  type: 'study' | 'exam'
  module_id: string
  dates?: string[] | null
  items?: PlanItem[] | null
}

interface DateEntry {
  id: string
  value: string
}

interface PlanDraft {
  id: string
  date: string
  text: string
  subjectId: string
  lessonId: string
  tools: PlanLinkKind[]
  note: string
}

interface SchedulesTabProps {
  dark: boolean
  modules: AdminModule[]
  context: AdminContext
}

// Creates an empty (or pre-filled) exam date field.
const createDateEntry = (value = ''): DateEntry => ({ id: crypto.randomUUID(), value })

// Creates an empty (or pre-filled) study plan item.
const createPlanDraft = (item?: PlanItem, subjectId = ''): PlanDraft => ({
  id: item?.id || crypto.randomUUID(),
  date: item?.date || '',
  text: item?.text || '',
  subjectId: item?.subject_id || subjectId,
  lessonId: item ? itemLessonId(item) || '' : '',
  tools: item ? itemTools(item) : [],
  note: item?.note || '',
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
  const [subjects, setSubjects] = useState<AdminSubject[]>([])

  // Loads the selected module's subjects and lessons (shared cache) for the plan item pickers.
  useEffect(() => {
    if (!context.moduleId) { setLessons([]); setSubjects([]); return }
    let ignore = false
    Promise.all([fetchSubjectsForModule(context.moduleId), fetchLessonsForModule(context.moduleId)]).then(([subjectsRes, lessonsRes]: any[]) => {
      if (ignore) return
      setSubjects(subjectsRes.subjects)
      setLessons(lessonsRes.lessons)
    })
    return () => { ignore = true }
  }, [context.moduleId])

  // Subject of a draft: the chosen one, or the subject of its lesson.
  const subjectOf = (p: PlanDraft) => p.subjectId || lessons.find(l => l.id === p.lessonId)?.subject_id || ''

  // Non-empty exam dates from the form.
  const cleanDates = () => dates.map(d => d.value.trim()).filter(Boolean)

  // Plan items with text from the form; the text falls back to the lesson title, and tools are kept only with a lesson.
  const cleanPlan = (): PlanItem[] =>
    plan
      .map(p => {
        const lesson = lessons.find(l => l.id === p.lessonId)
        const item: PlanItem = { id: p.id, date: p.date || null, text: p.text.trim() || lesson?.title || '' }
        const subjectId = subjectOf(p)
        if (subjectId) item.subject_id = subjectId
        if (p.lessonId) item.lesson_id = p.lessonId
        if (p.lessonId && p.tools.length > 0) item.tools = PLAN_TOOL_ORDER.filter(kind => p.tools.includes(kind))
        if (p.note.trim()) item.note = p.note.trim()
        return item
      })
      .filter(p => p.text)

  // True when a plan item has links but no lesson to open them for.
  const hasLinksWithoutLesson = () => plan.some(p => p.tools.length > 0 && !p.lessonId)

  // Loads a schedule into the form and moves the context bar to its module.
  function editSchedule(schedule: ScheduleRow) {
    setEditingId(schedule.id)
    setTitle(schedule.title)
    setUrl(schedule.url || '')
    setType(schedule.type)
    setDates((schedule.dates && schedule.dates.length > 0 ? schedule.dates : ['']).map(value => createDateEntry(value)))
    setPlan(schedule.items && schedule.items.length > 0 ? schedule.items.map(item => createPlanDraft(item)) : [createPlanDraft()])
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

  // Changes an item's subject and clears its lesson when it belongs to another subject.
  function changeSubject(p: PlanDraft, subjectId: string) {
    const keepLesson = lessons.some(l => l.id === p.lessonId && l.subject_id === subjectId)
    updatePlan(p.id, { subjectId, lessonId: keepLesson ? p.lessonId : '', tools: keepLesson ? p.tools : [] })
  }

  // Changes an item's lesson, taking the lesson's subject.
  function changeLesson(p: PlanDraft, lessonId: string) {
    const lesson = lessons.find(l => l.id === lessonId)
    updatePlan(p.id, { lessonId, subjectId: lesson?.subject_id || p.subjectId, tools: lessonId ? p.tools : [] })
  }

  // Turns one lesson link of a plan item on or off.
  function toggleTool(p: PlanDraft, kind: PlanLinkKind) {
    updatePlan(p.id, { tools: p.tools.includes(kind) ? p.tools.filter(k => k !== kind) : [...p.tools, kind] })
  }

  // Adds another plan item, starting on the same subject as the previous one.
  function addPlanItem() {
    setPlan(prev => [...prev, createPlanDraft(undefined, prev.length > 0 ? subjectOf(prev[prev.length - 1]) : '')])
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
    if (type === 'study' && hasLinksWithoutLesson()) return showMessage('❌ Choose a lesson for plan items that have links')
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
          <label style={fieldLabel(pt)}>Plan items — grouped by subject for students (date, links and note are optional)</label>
          {plan.map(p => {
            const subjectId = subjectOf(p)
            const lessonOptions = subjectId ? lessons.filter(l => l.subject_id === subjectId) : lessons
            const chosenLesson = lessons.find(l => l.id === p.lessonId)
            return (
              <div key={p.id} style={{ border: `1px solid ${pt.border}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
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
                    placeholder={chosenLesson?.title || 'e.g. Review lecture 3'}
                    value={p.text}
                    onChange={e => updatePlan(p.id, { text: e.target.value })}
                    style={{ ...inStyle, marginBottom: 0, flex: '1 1 180px', minWidth: 0 }}
                  />
                  <button onClick={() => removePlanItem(p.id)} aria-label="Remove this plan item" style={miniBtn(pt.danger)}>
                    <TrashIcon color={pt.danger} size={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <select
                    value={subjectId}
                    onChange={e => changeSubject(p, e.target.value)}
                    aria-label="Subject of this plan item"
                    style={{ ...inStyle, marginBottom: 0, flex: '1 1 150px', minWidth: 0 }}
                  >
                    <option value="">No subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select
                    value={p.lessonId}
                    onChange={e => changeLesson(p, e.target.value)}
                    aria-label="Lesson of this plan item"
                    style={{ ...inStyle, marginBottom: 0, flex: '1 1 180px', minWidth: 0 }}
                  >
                    <option value="">No lesson</option>
                    {lessonOptions.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {PLAN_TOOL_ORDER.map(kind => {
                    const meta = PLAN_TOOL_META[kind]
                    const color = planToolColor(kind, pt)
                    const on = p.tools.includes(kind)
                    return (
                      <button
                        key={kind} type="button" aria-pressed={on}
                        disabled={!p.lessonId}
                        onClick={() => toggleTool(p, kind)}
                        style={{
                          ...miniBtn(color),
                          border: `1px solid ${on ? color : `${color}66`}`,
                          background: on ? `${color}22` : 'transparent',
                          opacity: p.lessonId ? 1 : 0.5,
                          cursor: p.lessonId ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <meta.Icon color={color} size={12} /> {meta.label}
                      </button>
                    )
                  })}
                </div>

                <input
                  dir="auto"
                  placeholder="Note for students (optional)"
                  value={p.note}
                  onChange={e => updatePlan(p.id, { note: e.target.value })}
                  style={{ ...inStyle, marginBottom: 0 }}
                />
              </div>
            )
          })}
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
