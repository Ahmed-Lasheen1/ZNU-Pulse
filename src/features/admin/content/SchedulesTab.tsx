import { useState, useMemo } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import InlineMessage from '@/shared/ui/feedback/InlineMessage'
import AdminContextBar from '@/features/admin/common/AdminContextBar'
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

// A plan item being edited. `subjectId` and `lessonId` are the item's own choice;
// null means "follow the subject and lesson picked in the context bar".
interface PlanDraft {
  id: string
  date: string
  text: string
  subjectId: string | null
  lessonId: string | null
  tools: PlanLinkKind[]
  note: string
}

interface SchedulesTabProps {
  dark: boolean
  modules: AdminModule[]
  subjects: AdminSubject[]
  lessons: AdminLesson[]
  context: AdminContext
}

type ScheduleType = ScheduleRow['type']

const TYPE_OPTIONS = [
  { id: 'study', label: 'Study Plan', Icon: CalendarDotIcon },
  { id: 'exam', label: 'Exam Schedule', Icon: ExamIcon },
] as const

// Creates an empty (or pre-filled) exam date field.
const createDateEntry = (value = ''): DateEntry => ({ id: crypto.randomUUID(), value })

// Creates a plan item: new ones follow the context bar, saved ones keep their stored subject and lesson.
function createPlanDraft(item?: PlanItem, subjectId: string | null = null): PlanDraft {
  if (!item) return { id: crypto.randomUUID(), date: '', text: '', subjectId, lessonId: null, tools: [], note: '' }
  return {
    id: item.id,
    date: item.date || '',
    text: item.text || '',
    subjectId: item.subject_id || '',
    lessonId: itemLessonId(item) || '',
    tools: itemTools(item),
    note: item.note || '',
  }
}

// Uses an item's own choice when it belongs to the module, or the context bar value when the item follows the bar.
function resolveChoice(own: string | null, barValue: string, validIds: string[]) {
  if (own === null) return barValue
  return validIds.includes(own) ? own : ''
}

// Admin tab for adding, editing and deleting study plans and exam schedules; an image link is optional.
export default function SchedulesTab({ dark, modules, subjects, lessons, context }: SchedulesTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message, showMessage } = useAdminMessage()
  const { rows: schedules, loading, error, refresh } = useAdminList<ScheduleRow>({ table: 'schedules', moduleId: context.moduleId })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<ScheduleType | null>(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState<ScheduleType>('study')
  const [dates, setDates] = useState<DateEntry[]>(() => [createDateEntry()])
  const [plan, setPlan] = useState<PlanDraft[]>(() => [createPlanDraft()])

  // Subjects and lessons of the selected module (the lists come from the Admin shell).
  const moduleSubjects = useMemo(() => subjects.filter(s => s.module_id === context.moduleId), [subjects, context.moduleId])
  const moduleLessons = useMemo(() => lessons.filter(l => l.module_id === context.moduleId), [lessons, context.moduleId])

  // Works out an item's real subject and lesson; choices from another module are ignored, so they are never saved.
  function resolveDraft(p: PlanDraft) {
    const lessonId = resolveChoice(p.lessonId, context.lessonId, moduleLessons.map(l => l.id))
    const lessonSubject = moduleLessons.find(l => l.id === lessonId)?.subject_id || ''
    const subjectId = resolveChoice(p.subjectId, context.subjectId, moduleSubjects.map(s => s.id)) || lessonSubject
    return { subjectId, lessonId }
  }

  // Non-empty exam dates from the form.
  const cleanDates = () => dates.map(d => d.value.trim()).filter(Boolean)

  // Plan items with text from the form; the text falls back to the lesson title, and tools are kept only with a lesson.
  const cleanPlan = (): PlanItem[] =>
    plan
      .map(p => {
        const { subjectId, lessonId } = resolveDraft(p)
        const lesson = moduleLessons.find(l => l.id === lessonId)
        const item: PlanItem = { id: p.id, date: p.date || null, text: p.text.trim() || lesson?.title || '' }
        if (subjectId) item.subject_id = subjectId
        if (lessonId) item.lesson_id = lessonId
        if (lessonId && p.tools.length > 0) item.tools = PLAN_TOOL_ORDER.filter(kind => p.tools.includes(kind))
        if (p.note.trim()) item.note = p.note.trim()
        return item
      })
      .filter(p => p.text)

  // True when a plan item has links but no lesson to open them for.
  const hasLinksWithoutLesson = () => plan.some(p => p.tools.length > 0 && !resolveDraft(p).lessonId)

  // Loads a schedule into the form and moves the context bar to its module.
  function editSchedule(schedule: ScheduleRow) {
    setEditingId(schedule.id)
    setEditingType(schedule.type)
    setTitle(schedule.title)
    setUrl(schedule.url || '')
    setType(schedule.type)
    setDates((schedule.dates && schedule.dates.length > 0 ? schedule.dates : ['']).map(value => createDateEntry(value)))
    setPlan(schedule.items && schedule.items.length > 0 ? schedule.items.map(item => createPlanDraft(item)) : [createPlanDraft()])
    context.setContext({ moduleId: schedule.module_id, subjectId: '', lessonId: '' })
  }

  // Clears the form after a save or cancel; a finished edit also returns the type to Study Plan.
  function resetForm() {
    if (editingId) setType('study')
    setEditingId(null)
    setEditingType(null)
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

  // Sets an item's own subject and drops its lesson when that lesson belongs to another subject.
  function changeSubject(p: PlanDraft, subjectId: string) {
    const { lessonId } = resolveDraft(p)
    const keepLesson = moduleLessons.some(l => l.id === lessonId && l.subject_id === subjectId)
    updatePlan(p.id, { subjectId, lessonId: keepLesson ? lessonId : '', tools: keepLesson ? p.tools : [] })
  }

  // Sets an item's own lesson, taking the lesson's subject.
  function changeLesson(p: PlanDraft, lessonId: string) {
    const lesson = moduleLessons.find(l => l.id === lessonId)
    updatePlan(p.id, { lessonId, subjectId: lesson ? lesson.subject_id : resolveDraft(p).subjectId, tools: lessonId ? p.tools : [] })
  }

  // Turns one lesson link of a plan item on or off.
  function toggleTool(p: PlanDraft, kind: PlanLinkKind) {
    updatePlan(p.id, { tools: p.tools.includes(kind) ? p.tools.filter(k => k !== kind) : [...p.tools, kind] })
  }

  // Adds another plan item: it follows the context bar, or starts on the previous item's subject when the bar has none.
  function addPlanItem() {
    setPlan(prev => {
      const previousSubject = prev.length > 0 ? resolveDraft(prev[prev.length - 1]).subjectId : ''
      return [...prev, createPlanDraft(undefined, context.subjectId || !previousSubject ? null : previousSubject)]
    })
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

  const typeChangeWarning = editingId && editingType && type !== editingType
    ? `Saving as ${type === 'exam' ? 'an exam schedule' : 'a study plan'} removes this schedule's ${editingType === 'exam' ? 'exam dates' : 'plan items'}.`
    : null

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
      <label style={fieldLabel(pt)}>Type</label>
      <div role="group" aria-label="Schedule type" style={{ display: 'flex', gap: 8, marginBottom: typeChangeWarning ? 8 : 16 }}>
        {TYPE_OPTIONS.map(option => {
          const active = type === option.id
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setType(option.id)}
              style={{
                flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${active ? pt.cobalt : pt.border}`,
                background: active ? `${pt.cobalt}18` : 'transparent',
                color: active ? pt.cobalt : pt.sub, fontWeight: 700, fontSize: 12,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <option.Icon color={active ? pt.cobalt : pt.sub} size={13} /> {option.label}
            </button>
          )
        })}
      </div>
      {typeChangeWarning && <p style={{ color: pt.amber, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>{typeChangeWarning}</p>}

      <input placeholder={type === 'study' ? 'Title (e.g. Week 1 plan)' : 'Title (e.g. Midterm)'} value={title} onChange={e => setTitle(e.target.value)} style={inStyle} />

      {type === 'study' && (
        <>
          <label style={fieldLabel(pt)}>Plan items — the subject and lesson picked above are pre-filled; change them per item if needed (date, links and note are optional)</label>
          {plan.map(p => {
            const { subjectId, lessonId } = resolveDraft(p)
            const lessonOptions = subjectId ? moduleLessons.filter(l => l.subject_id === subjectId) : moduleLessons
            const chosenLesson = moduleLessons.find(l => l.id === lessonId)
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
                    {moduleSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select
                    value={lessonId}
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
                        disabled={!lessonId}
                        onClick={() => toggleTool(p, kind)}
                        style={{
                          ...miniBtn(color),
                          border: `1px solid ${on ? color : `${color}66`}`,
                          background: on ? `${color}22` : 'transparent',
                          opacity: lessonId ? 1 : 0.5,
                          cursor: lessonId ? 'pointer' : 'not-allowed',
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
      {/* Study plans pick subject and lesson here; exams only need the module. */}
      <AdminContextBar
        dark={dark} modules={modules} subjects={subjects} lessons={lessons}
        context={context} depth={type === 'study' ? 3 : 1}
      />
      <InlineMessage message={message} />
      <AdminSplitLayout form={form} list={list} />
      <AdminDeleteDialog dark={dark} noun="schedule" del={del} />
    </div>
  )
}
