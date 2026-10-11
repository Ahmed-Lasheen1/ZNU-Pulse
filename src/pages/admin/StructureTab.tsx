import { useState, useEffect, Fragment, type CSSProperties } from 'react'
import { ChevronDown } from 'lucide-react'
import { getPulseTheme } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/pulse/EmptyState'
import { ModuleIcon, NotesIcon } from '../../lib/medicalIcons'
import AdminSplitLayout from './AdminSplitLayout'
import AdminFormCard from './AdminFormCard'
import AdminContextBar from './AdminContextBar'
import AdminPill from './AdminPill'
import AdminRow from './AdminRow'
import ModuleForm from './ModuleForm'
import SubjectForm from './SubjectForm'
import LessonForm from './LessonForm'
import StagesPanel from './StagesPanel'
import { useAdminMessage } from './useAdminMessage'
import { deleteAdminEntity } from './useAdminEntityCrud'
import { PackageIcon, BookIcon, TargetIcon, ConstructionIcon } from '../../components/ui/tool-icons'
import type { AdminModule, AdminSubject, AdminLesson, AdminContext, ContextSelection } from './adminTypes'

const MODES = [
  { id: 'module', label: 'Module', Icon: PackageIcon, depth: 0 },
  { id: 'subject', label: 'Subject', Icon: BookIcon, depth: 1 },
  { id: 'lesson', label: 'Lesson', Icon: NotesIcon, depth: 2 },
  { id: 'stages', label: 'Stages', Icon: TargetIcon, depth: 1 },
] as const

type StructureMode = typeof MODES[number]['id']
type EntityKind = 'module' | 'subject' | 'lesson'

interface DeleteTarget {
  kind: EntityKind
  id: string
}

interface StructureTabProps {
  dark: boolean
  modules: AdminModule[]
  subjects: AdminSubject[]
  lessons: AdminLesson[]
  context: AdminContext
  loading: boolean
  refresh: () => Promise<void>
}

const DELETE_COPY: Record<EntityKind, { table: string; label: string; message: string }> = {
  module: {
    table: 'modules',
    label: 'Module',
    message: 'This will also permanently delete all its subjects, files, schedules, questions and summaries. This cannot be undone.',
  },
  subject: {
    table: 'subjects',
    label: 'Subject',
    message: 'Its files, lessons and questions will also be deleted. This cannot be undone.',
  },
  lesson: {
    table: 'lessons',
    label: 'Lesson',
    message: 'Questions tagged to it keep their module/subject tags but lose the lesson link. This cannot be undone.',
  },
}

const DEFAULT_SUBJECT_COLOR = '#34d399'

const rowLeadStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: 0,
  background: 'transparent', border: 'none', font: 'inherit', color: 'inherit',
}

interface TreeRowProps {
  dark: boolean
  noun: string
  label: string
  icon?: string | null
  fallbackIcon: string
  color: string
  indent: number
  active: boolean
  count?: number
  open?: boolean
  badge?: string
  onToggle?: () => void
  onEdit: () => void
  onDelete: () => void
}

function TreeRow({ dark, noun, label, icon, fallbackIcon, color, indent, active, count, open, badge, onToggle, onEdit, onDelete }: TreeRowProps) {
  const pt = getPulseTheme(dark)
  const lead = (
    <>
      {onToggle
        ? <ChevronDown size={14} color={pt.textMuted} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
        : <span style={{ width: 14 }} />}
      <ModuleIcon value={icon || fallbackIcon} size={22} color={color} />
      <span style={{ color, fontWeight: 700 }}>{label}</span>
      {count !== undefined && <span style={{ color: pt.textMuted, fontSize: 12 }}>({count})</span>}
    </>
  )

  return (
    <div style={{ marginLeft: indent }}>
      <AdminRow dark={dark} noun={noun} label={label} active={active} onEdit={onEdit} onDelete={onDelete}>
        {onToggle
          ? <button type="button" onClick={onToggle} aria-expanded={open} style={{ ...rowLeadStyle, cursor: 'pointer' }}>{lead}</button>
          : <span style={rowLeadStyle}>{lead}</span>}
        {badge && (
          <span style={{
            color: pt.textMuted, border: `1px solid ${pt.border}`, borderRadius: 999,
            padding: '1px 8px', fontSize: 11, fontWeight: 700
          }}>{badge}</span>
        )}
      </AdminRow>
    </div>
  )
}

export default function StructureTab({ dark, modules, subjects, lessons, context, loading, refresh }: StructureTabProps) {
  const pt = getPulseTheme(dark)
  const { message, showMessage } = useAdminMessage()
  const [mode, setMode] = useState<StructureMode>('module')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openModuleId, setOpenModuleId] = useState<string | null>(null)
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  useEffect(() => {
    if (context.moduleId) setOpenModuleId(context.moduleId)
  }, [context.moduleId])

  useEffect(() => {
    if (context.subjectId) setOpenSubjectId(context.subjectId)
  }, [context.subjectId])

  const depth = MODES.find(m => m.id === mode)?.depth ?? 0

  function selectMode(next: StructureMode) {
    setMode(next)
    setEditingId(null)
  }

  function startEdit(kind: EntityKind, id: string, parents: ContextSelection) {
    setMode(kind)
    setEditingId(id)
    context.setContext(parents)
  }

  function toggleModule(id: string) {
    if (openModuleId === id) return setOpenModuleId(null)
    context.setContext({ moduleId: id, subjectId: '', lessonId: '' })
    setOpenModuleId(id)
  }

  function toggleSubject(subject: AdminSubject) {
    if (openSubjectId === subject.id) return setOpenSubjectId(null)
    context.setContext({ moduleId: subject.module_id, subjectId: subject.id, lessonId: '' })
    setOpenSubjectId(subject.id)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const { kind, id } = deleteTarget
    const copy = DELETE_COPY[kind]
    setDeleteTarget(null)
    const error = await deleteAdminEntity(copy.table, id)
    showMessage(error ? '❌ ' + error.message : `✅ ${copy.label} deleted`)
    if (error) return
    if (editingId === id) setEditingId(null)
    await refresh()
  }

  function renderForm() {
    const common = { dark, showMessage, onSaved: refresh, onDone: () => setEditingId(null) }

    if (mode === 'module') {
      return (
        <ModuleForm
          key={`module-${editingId}`}
          {...common}
          module={modules.find(m => m.id === editingId) ?? null}
          modules={modules}
        />
      )
    }

    if (mode === 'subject') {
      const subject = subjects.find(s => s.id === editingId) ?? null
      const parent = modules.find(m => m.id === (subject ? subject.module_id : context.moduleId))
      if (!parent) return <AdminFormCard dark={dark} noun="Subject" description="Pick a module above to add subjects to it." />
      return <SubjectForm key={`subject-${editingId}`} {...common} subject={subject} module={parent} subjects={subjects} />
    }

    if (mode === 'lesson') {
      const lesson = lessons.find(l => l.id === editingId) ?? null
      const subject = subjects.find(s => s.id === (lesson ? lesson.subject_id : context.subjectId))
      const parent = modules.find(m => m.id === subject?.module_id)
      if (!subject || !parent) {
        return <AdminFormCard dark={dark} noun="Lesson" description="Pick a module and a subject above to add lessons to it." />
      }
      return <LessonForm key={`lesson-${editingId}`} {...common} lesson={lesson} module={parent} subject={subject} />
    }

    const parent = modules.find(m => m.id === context.moduleId)
    if (!parent) {
      return <AdminFormCard dark={dark} title="Exam Stages" Icon={TargetIcon} description="Pick a module above to edit its exam stages and simulator." />
    }
    return (
      <StagesPanel
        key={`stages-${parent.id}`}
        dark={dark}
        module={parent}
        subjects={subjects.filter(s => s.module_id === parent.id)}
        showMessage={showMessage}
      />
    )
  }

  function renderLesson(lesson: AdminLesson, color: string) {
    return (
      <TreeRow
        key={lesson.id}
        dark={dark}
        noun="lesson"
        label={lesson.title}
        icon={lesson.icon}
        fallbackIcon="📘"
        color={color}
        indent={48}
        active={mode === 'lesson' && editingId === lesson.id}
        onEdit={() => startEdit('lesson', lesson.id, { moduleId: lesson.module_id, subjectId: lesson.subject_id, lessonId: '' })}
        onDelete={() => setDeleteTarget({ kind: 'lesson', id: lesson.id })}
      />
    )
  }

  function renderSubject(subject: AdminSubject) {
    const open = openSubjectId === subject.id
    const subjectLessons = lessons.filter(l => l.subject_id === subject.id)
    const color = subject.color || DEFAULT_SUBJECT_COLOR
    return (
      <Fragment key={subject.id}>
        <TreeRow
          dark={dark}
          noun="subject"
          label={subject.name}
          icon={subject.icon}
          fallbackIcon="📖"
          color={color}
          indent={24}
          count={subjectLessons.length}
          open={open}
          active={mode === 'subject' && editingId === subject.id}
          onToggle={() => toggleSubject(subject)}
          onEdit={() => startEdit('subject', subject.id, { moduleId: subject.module_id, subjectId: '', lessonId: '' })}
          onDelete={() => setDeleteTarget({ kind: 'subject', id: subject.id })}
        />
        {open && subjectLessons.map(lesson => renderLesson(lesson, color))}
      </Fragment>
    )
  }

  function renderModule(mod: AdminModule) {
    const open = openModuleId === mod.id
    const moduleSubjects = subjects.filter(s => s.module_id === mod.id)
    return (
      <Fragment key={mod.id}>
        <TreeRow
          dark={dark}
          noun="module"
          label={mod.name}
          icon={mod.icon}
          fallbackIcon="📚"
          color={mod.color}
          indent={0}
          count={moduleSubjects.length}
          open={open}
          badge={mod.status === 'active' ? undefined : 'Completed'}
          active={mode === 'module' && editingId === mod.id}
          onToggle={() => toggleModule(mod.id)}
          onEdit={() => startEdit('module', mod.id, { moduleId: mod.id, subjectId: '', lessonId: '' })}
          onDelete={() => setDeleteTarget({ kind: 'module', id: mod.id })}
        />
        {open && moduleSubjects.map(renderSubject)}
      </Fragment>
    )
  }

  const list = (
    <div>
      {loading && <EmptyState dark={dark} message="Loading..." />}
      {!loading && modules.length === 0 && (
        <EmptyState dark={dark} message={<><ConstructionIcon color={pt.sub} size={14} /> No modules yet — add one on the left</>} />
      )}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {modules.map(renderModule)}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <InlineMessage message={message} />

      <div className="admin-tabs" style={{ marginBottom: 8 }}>
        {MODES.map(m => (
          <AdminPill key={m.id} dark={dark} active={mode === m.id} label={m.label} Icon={m.Icon} onSelect={() => selectMode(m.id)} />
        ))}
      </div>

      {depth > 0 && (
        <AdminContextBar dark={dark} modules={modules} subjects={subjects} lessons={lessons} context={context} depth={depth} />
      )}

      <AdminSplitLayout form={renderForm()} list={list} />

      <ConfirmDialog
        dark={dark}
        open={!!deleteTarget}
        title={deleteTarget ? `Delete ${DELETE_COPY[deleteTarget.kind].label.toLowerCase()}?` : ''}
        message={deleteTarget ? DELETE_COPY[deleteTarget.kind].message : ''}
        confirmLabel="Delete"
        confirmColor={pt.danger}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
