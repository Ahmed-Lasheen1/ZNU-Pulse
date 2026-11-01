import { useState, useEffect, useCallback, useMemo } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog'
import EmptyState from '@/shared/ui/feedback/EmptyState'
import { CardRowsSkeleton } from '@/shared/ui/feedback/Skeletons'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import { fetchLessonStageMap } from '@/services/content/lessonStages'
import { ModuleIcon, NotesIcon } from '@/shared/icons/medicalIcons'
import { PackageIcon, BookIcon, TargetIcon, ConstructionIcon } from '@/shared/icons/tool-icons'
import AdminContextBar from '@/features/admin/common/AdminContextBar'
import AdminPill from '@/features/admin/common/AdminPill'
import AdminSplitLayout from '@/features/admin/common/AdminSplitLayout'
import AdminRow from '@/features/admin/common/AdminRow'
import ModuleForm from '@/features/admin/structure/ModuleForm'
import SubjectForm from '@/features/admin/structure/SubjectForm'
import LessonForm from '@/features/admin/structure/LessonForm'
import StagesPanel from '@/features/admin/structure/StagesPanel'
import { useStageOptions } from '@/features/admin/common/useStageOptions'
import { miniBtn, groupHeading } from '@/features/admin/common/adminStyles'
import { deleteAdminEntity } from '@/features/admin/common/useAdminEntityCrud'
import { SUBJECT_DEFAULTS, LESSON_FALLBACK_ICON, FALLBACK_STAGE_COLOR } from '@/features/admin/common/adminHelpers'
import { plural } from '@/shared/utils/format'
import type { AdminModule, AdminSubject, AdminLesson, AdminContext } from '@/features/admin/common/adminTypes'

type EntityKind = 'module' | 'subject' | 'lesson'

interface DeleteTarget { kind: EntityKind; id: string }

interface StructureTabProps {
  dark: boolean
  modules: AdminModule[]
  subjects: AdminSubject[]
  lessons: AdminLesson[]
  context: AdminContext
  loading: boolean
  refresh: () => Promise<void>
}

const SEGMENTS = [
  { id: 'modules', label: 'Modules', Icon: PackageIcon, depth: 0 },
  { id: 'subjects', label: 'Subjects', Icon: BookIcon, depth: 1 },
  { id: 'lessons', label: 'Lessons', Icon: NotesIcon, depth: 2 },
  { id: 'stages', label: 'Stages', Icon: TargetIcon, depth: 1 },
] as const

type Segment = typeof SEGMENTS[number]['id']

const ENTITY_COPY: Record<EntityKind, { table: string; label: string; deleteMessage: string }> = {
  module: {
    table: 'modules', label: 'Module',
    deleteMessage: 'This will also permanently delete all its subjects, files, schedules, questions and summaries. This cannot be undone.',
  },
  subject: {
    table: 'subjects', label: 'Subject',
    deleteMessage: 'Its files, lessons and questions will also be deleted. This cannot be undone.',
  },
  lesson: {
    table: 'lessons', label: 'Lesson',
    deleteMessage: 'Questions tagged to it keep their module/subject tags but lose the lesson link. This cannot be undone.',
  },
}

export default function StructureTab({ dark, modules, subjects, lessons, context, loading, refresh }: StructureTabProps) {
  const pt = getPulseTheme(dark)
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void
  const showMessage = useCallback(
    (text: string) => showToast(text, text.startsWith('❌') ? 'error' : 'success'),
    [showToast]
  )

  const [segment, setSegment] = useState<Segment>('lessons')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [stageMap, setStageMap] = useState<Record<string, string[]>>({})
  const stageOptions = useStageOptions(context.moduleId)

  useEffect(() => {
    let ignore = false
    fetchLessonStageMap().then(({ map }) => { if (!ignore) setStageMap(map) })
    return () => { ignore = true }
  }, [lessons])

  const { moduleId, subjectId } = context
  const currentModule = modules.find(m => m.id === moduleId) ?? null
  const currentSubject = subjects.find(s => s.id === subjectId) ?? null

  const counts = useMemo(() => {
    const subjectsIn: Record<string, number> = {}
    const lessonsInModule: Record<string, number> = {}
    const lessonsInSubject: Record<string, number> = {}
    subjects.forEach(s => { subjectsIn[s.module_id] = (subjectsIn[s.module_id] || 0) + 1 })
    lessons.forEach(l => {
      lessonsInModule[l.module_id] = (lessonsInModule[l.module_id] || 0) + 1
      lessonsInSubject[l.subject_id] = (lessonsInSubject[l.subject_id] || 0) + 1
    })
    return { subjectsIn, lessonsInModule, lessonsInSubject }
  }, [subjects, lessons])

  function changeSegment(next: Segment) {
    setSegment(next)
    setEditingId(null)
  }

  function openSubjects(module: AdminModule) {
    context.setContext({ moduleId: module.id, subjectId: '', lessonId: '' })
    changeSegment('subjects')
  }

  function openLessons(subject: AdminSubject) {
    context.setContext({ moduleId: subject.module_id, subjectId: subject.id, lessonId: '' })
    changeSegment('lessons')
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const { kind, id } = deleteTarget
    const copy = ENTITY_COPY[kind]
    setDeleteTarget(null)
    const error = await deleteAdminEntity(copy.table, id)
    showMessage(error ? '❌ ' + error.message : `✅ ${copy.label} deleted`)
    if (error) return
    if (editingId === id) setEditingId(null)
    await refresh()
  }

  const common = { dark, showMessage, onSaved: refresh, onDone: () => setEditingId(null) }

  const prompt = (text: string) => <EmptyState dark={dark} message={text} />

  const emptyList = (noun: string) => (
    <EmptyState dark={dark} message={<><ConstructionIcon color={pt.sub} size={14} /> No {noun} yet — add one on the left</>} />
  )

  const muted = { color: pt.textMuted, fontSize: 12 }

  function renderModules() {
    const module = editingId ? modules.find(m => m.id === editingId) ?? null : null

    const form = <ModuleForm key={`module-${module?.id ?? 'new'}`} {...common} module={module} modules={modules} />

    const list = (
      <div>
        <h4 style={groupHeading(pt.cobalt)}>Modules ({modules.length})</h4>
        {modules.length === 0 ? emptyList('modules') : (
          <div className="admin-list-grid">
            {modules.map(m => (
              <AdminRow
                key={m.id}
                dark={dark}
                noun="module"
                label={m.name}
                active={editingId === m.id}
                actions={<button type="button" onClick={() => openSubjects(m)} style={miniBtn(pt.sub)}>Subjects →</button>}
                onEdit={() => setEditingId(m.id)}
                onDelete={() => setDeleteTarget({ kind: 'module', id: m.id })}
              >
                <ModuleIcon value={m.icon} size={18} color={m.color} />
                <span style={{ color: pt.text, fontWeight: 700 }}>{m.name}</span>
                <span style={muted}>
                  · {plural(counts.subjectsIn[m.id] || 0, 'subject')} · {plural(counts.lessonsInModule[m.id] || 0, 'lesson')}
                  {m.status === 'completed' ? ' · Completed' : ''}
                </span>
              </AdminRow>
            ))}
          </div>
        )}
      </div>
    )

    return <AdminSplitLayout form={form} list={list} />
  }

  function renderSubjects() {
    if (!currentModule) return prompt('Pick a module above to manage its subjects')

    const subject = editingId ? subjects.find(s => s.id === editingId) ?? null : null
    const parent = subject ? modules.find(m => m.id === subject.module_id) ?? null : currentModule
    if (!parent) return prompt('Pick a module above to manage its subjects')

    const visible = subjects.filter(s => s.module_id === currentModule.id)

    const form = (
      <SubjectForm
        key={`subject-${subject?.id ?? `new-${parent.id}`}`}
        {...common}
        subject={subject}
        module={parent}
        subjects={subjects}
      />
    )

    const list = (
      <div>
        <h4 style={groupHeading(currentModule.color)}>Subjects in {currentModule.name} ({visible.length})</h4>
        {visible.length === 0 ? emptyList('subjects') : (
          <div className="admin-list-grid">
            {visible.map(s => (
              <AdminRow
                key={s.id}
                dark={dark}
                noun="subject"
                label={s.name}
                active={editingId === s.id}
                actions={<button type="button" onClick={() => openLessons(s)} style={miniBtn(pt.sub)}>Lessons →</button>}
                onEdit={() => setEditingId(s.id)}
                onDelete={() => setDeleteTarget({ kind: 'subject', id: s.id })}
              >
                <ModuleIcon value={s.icon} size={18} color={s.color || SUBJECT_DEFAULTS.color} fallbackEmoji={SUBJECT_DEFAULTS.icon} />
                <span style={{ color: pt.text, fontWeight: 700 }}>{s.name}</span>
                <span style={muted}>· {plural(counts.lessonsInSubject[s.id] || 0, 'lesson')}</span>
              </AdminRow>
            ))}
          </div>
        )}
      </div>
    )

    return <AdminSplitLayout form={form} list={list} />
  }

  function renderLessons() {
    if (!currentModule) return prompt('Pick a module above to manage its lessons')

    const lesson = editingId ? lessons.find(l => l.id === editingId) ?? null : null
    const formSubject = subjects.find(s => s.id === (lesson ? lesson.subject_id : subjectId)) ?? null
    const formModule = formSubject ? modules.find(m => m.id === formSubject.module_id) ?? null : null
    const moduleHasSubjects = subjects.some(s => s.module_id === currentModule.id)

    const form = formSubject && formModule ? (
      <LessonForm
        key={`lesson-${lesson?.id ?? `new-${formSubject.id}`}`}
        {...common}
        lesson={lesson}
        module={formModule}
        subject={formSubject}
      />
    ) : prompt(moduleHasSubjects ? 'Pick a subject above to add a lesson' : 'This module has no subjects yet — add one in the Subjects tab')

    const visible = lessons.filter(l => (subjectId ? l.subject_id === subjectId : l.module_id === currentModule.id))
    const scopeName = currentSubject ? currentSubject.name : currentModule.name

    const list = (
      <div>
        <h4 style={groupHeading(currentModule.color)}>Lessons in {scopeName} ({visible.length})</h4>
        {visible.length === 0 ? emptyList('lessons') : (
          <div className="admin-list-grid">
            {visible.map(l => (
              <AdminRow
                key={l.id}
                dark={dark}
                noun="lesson"
                label={l.title}
                active={editingId === l.id}
                onEdit={() => setEditingId(l.id)}
                onDelete={() => setDeleteTarget({ kind: 'lesson', id: l.id })}
              >
                <ModuleIcon value={l.icon} size={18} color={currentSubject?.color || SUBJECT_DEFAULTS.color} fallbackEmoji={LESSON_FALLBACK_ICON} />
                <span style={{ color: pt.text, fontWeight: 600, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{l.title}</span>
                {!subjectId && (
                  <span style={muted}>· {subjects.find(s => s.id === l.subject_id)?.name ?? ''}</span>
                )}
                {(stageMap[l.id] || []).map(value => {
                  const option = stageOptions.find(o => o.value === value)
                  const color = option?.color ?? FALLBACK_STAGE_COLOR
                  return (
                    <span key={value} style={{
                      background: `${color}22`, border: `1px solid ${color}55`, color,
                      borderRadius: 999, padding: '1px 8px', fontSize: 10.5, fontWeight: 700
                    }}>{option?.label ?? value}</span>
                  )
                })}
              </AdminRow>
            ))}
          </div>
        )}
      </div>
    )

    return <AdminSplitLayout form={form} list={list} />
  }

  function renderStages() {
    if (!currentModule) return prompt('Pick a module above to manage its exam stages')
    return (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <StagesPanel
          key={`stages-${currentModule.id}`}
          dark={dark}
          module={currentModule}
          subjects={subjects.filter(s => s.module_id === currentModule.id)}
          showMessage={showMessage}
        />
      </div>
    )
  }

  const depth = SEGMENTS.find(s => s.id === segment)?.depth ?? 0

  return (
    <div>
      <div className="admin-tabs" style={{ marginBottom: 16 }}>
        {SEGMENTS.map(s => (
          <AdminPill
            key={s.id}
            dark={dark}
            active={segment === s.id}
            label={s.label}
            Icon={s.Icon}
            onSelect={() => changeSegment(s.id)}
          />
        ))}
      </div>

      {loading ? (
        <CardRowsSkeleton count={4} variant="admin" label="Loading structure" />
      ) : (
        <>
          {depth > 0 && (
            <AdminContextBar dark={dark} modules={modules} subjects={subjects} lessons={lessons} context={context} depth={depth} />
          )}
          {segment === 'modules' && renderModules()}
          {segment === 'subjects' && renderSubjects()}
          {segment === 'lessons' && renderLessons()}
          {segment === 'stages' && renderStages()}
        </>
      )}

      <ConfirmDialog
        dark={dark}
        open={!!deleteTarget}
        title={deleteTarget ? `Delete ${ENTITY_COPY[deleteTarget.kind].label.toLowerCase()}?` : ''}
        message={deleteTarget ? ENTITY_COPY[deleteTarget.kind].deleteMessage : ''}
        confirmLabel="Delete"
        confirmColor={pt.danger}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
