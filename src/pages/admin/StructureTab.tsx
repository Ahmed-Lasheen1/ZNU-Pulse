import { useState, useEffect, useCallback, Fragment, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/pulse/EmptyState'
import { CardRowsSkeleton } from '../../components/pulse/Skeletons'
import { useToast } from '../../components/ToastProvider'
import { ModuleIcon } from '../../lib/medicalIcons'
import AdminSplitLayout from './AdminSplitLayout'
import AdminRow from './AdminRow'
import ModuleForm from './ModuleForm'
import SubjectForm from './SubjectForm'
import LessonForm from './LessonForm'
import StagesPanel from './StagesPanel'
import QuickAddRow from './QuickAddRow'
import { miniBtn } from './adminStyles'
import { deleteAdminEntity } from './useAdminEntityCrud'
import { SUBJECT_DEFAULTS, MODULE_DEFAULTS, LESSON_FALLBACK_ICON, normalizeName, freshNames, plural } from './adminHelpers'
import { TargetIcon, ConstructionIcon } from '../../components/ui/tool-icons'
import type { AdminModule, AdminSubject, AdminLesson, AdminContext } from './adminTypes'

type EntityKind = 'module' | 'subject' | 'lesson'

type Editor =
  | { kind: 'module'; id: string | null }
  | { kind: 'subject'; id: string | null; moduleId: string }
  | { kind: 'lesson'; id: string | null; subjectId: string }
  | { kind: 'stages'; moduleId: string }

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

const ADD_MODULE: Editor = { kind: 'module', id: null }

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

const rowLeadStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: 0,
  background: 'transparent', border: 'none', font: 'inherit', color: 'inherit',
}

function editorTouches(editor: Editor, id: string) {
  if (editor.kind === 'module') return editor.id === id
  if (editor.kind === 'subject') return editor.id === id || editor.moduleId === id
  if (editor.kind === 'lesson') return editor.id === id || editor.subjectId === id
  return editor.moduleId === id
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
  actions?: ReactNode
  onToggle?: () => void
  onEdit: () => void
  onDelete: () => void
}

function TreeRow({ dark, noun, label, icon, fallbackIcon, color, indent, active, count, open, badge, actions, onToggle, onEdit, onDelete }: TreeRowProps) {
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
      <AdminRow dark={dark} noun={noun} label={label} active={active} actions={actions} onEdit={onEdit} onDelete={onDelete}>
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
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void
  const showMessage = useCallback(
    (text: string) => showToast(text, text.startsWith('❌') ? 'error' : 'success'),
    [showToast]
  )
  const [editor, setEditor] = useState<Editor>(ADD_MODULE)
  const [openModuleId, setOpenModuleId] = useState<string | null>(null)
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  useEffect(() => {
    if (context.moduleId) setOpenModuleId(context.moduleId)
  }, [context.moduleId])

  useEffect(() => {
    if (context.subjectId) setOpenSubjectId(context.subjectId)
  }, [context.subjectId])

  function finishEdit() {
    setEditor(prev => prev.kind === 'subject' || prev.kind === 'lesson' ? { ...prev, id: null } : ADD_MODULE)
  }

  function editModule(mod: AdminModule) {
    setEditor({ kind: 'module', id: mod.id })
    context.setContext({ moduleId: mod.id, subjectId: '', lessonId: '' })
  }

  function editStages(mod: AdminModule) {
    setEditor({ kind: 'stages', moduleId: mod.id })
    context.setContext({ moduleId: mod.id, subjectId: '', lessonId: '' })
  }

  function editSubject(subject: AdminSubject | null, moduleId: string) {
    setEditor({ kind: 'subject', id: subject?.id ?? null, moduleId })
    context.setContext({ moduleId, subjectId: '', lessonId: '' })
  }

  function editLesson(lesson: AdminLesson | null, subject: AdminSubject) {
    setEditor({ kind: 'lesson', id: lesson?.id ?? null, subjectId: subject.id })
    context.setContext({ moduleId: subject.module_id, subjectId: subject.id, lessonId: '' })
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

  async function quickInsert(
    table: 'subjects' | 'lessons',
    noun: string,
    names: string[],
    existingNames: string[],
    build: (name: string, createdAt: string) => Record<string, unknown>
  ) {
    const fresh = freshNames(names, new Set(existingNames.map(normalizeName)))
    if (fresh.length === 0) {
      showMessage('❌ Already exists here')
      return false
    }
    const base = Date.now()
    const { error } = await supabase.from(table).insert(fresh.map((name, i) => build(name, new Date(base + i).toISOString())))
    if (error) {
      showMessage('❌ ' + error.message)
      return false
    }
    const skipped = names.length - fresh.length
    showMessage(`✅ ${plural(fresh.length, noun)} added${skipped > 0 ? ` (${skipped} already existed)` : ''}`)
    await refresh()
    return true
  }

  function quickAddSubjects(mod: AdminModule, names: string[]) {
    return quickInsert(
      'subjects', 'subject', names,
      subjects.filter(s => s.module_id === mod.id).map(s => s.name),
      (name, createdAt) => ({
        name, module_id: mod.id, type: SUBJECT_DEFAULTS.type,
        icon: SUBJECT_DEFAULTS.icon, color: SUBJECT_DEFAULTS.color, created_at: createdAt,
      })
    )
  }

  function quickAddLessons(subject: AdminSubject, names: string[]) {
    return quickInsert(
      'lessons', 'lesson', names,
      lessons.filter(l => l.subject_id === subject.id).map(l => l.title),
      (title, createdAt) => ({
        title, subject_id: subject.id, module_id: subject.module_id, icon: null, created_at: createdAt,
      })
    )
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const { kind, id } = deleteTarget
    const copy = DELETE_COPY[kind]
    setDeleteTarget(null)
    const error = await deleteAdminEntity(copy.table, id)
    showMessage(error ? '❌ ' + error.message : `✅ ${copy.label} deleted`)
    if (error) return
    if (editorTouches(editor, id)) setEditor(ADD_MODULE)
    await refresh()
  }

  function renderForm() {
    const common = { dark, showMessage, onSaved: refresh, onDone: finishEdit }
    const addModuleForm = <ModuleForm key="module-new" {...common} module={null} modules={modules} />

    if (editor.kind === 'module') {
      const module = editor.id ? modules.find(m => m.id === editor.id) ?? null : null
      return <ModuleForm key={`module-${editor.id ?? 'new'}`} {...common} module={module} modules={modules} />
    }

    if (editor.kind === 'subject') {
      const subject = editor.id ? subjects.find(s => s.id === editor.id) ?? null : null
      const parent = modules.find(m => m.id === (subject ? subject.module_id : editor.moduleId))
      if (!parent) return addModuleForm
      return <SubjectForm key={`subject-${editor.id ?? `new-${parent.id}`}`} {...common} subject={subject} module={parent} subjects={subjects} />
    }

    if (editor.kind === 'lesson') {
      const lesson = editor.id ? lessons.find(l => l.id === editor.id) ?? null : null
      const subject = subjects.find(s => s.id === (lesson ? lesson.subject_id : editor.subjectId))
      const parent = modules.find(m => m.id === subject?.module_id)
      if (!subject || !parent) return addModuleForm
      return <LessonForm key={`lesson-${editor.id ?? `new-${subject.id}`}`} {...common} lesson={lesson} module={parent} subject={subject} />
    }

    const parent = modules.find(m => m.id === editor.moduleId)
    if (!parent) return addModuleForm
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

  function renderLesson(lesson: AdminLesson, subject: AdminSubject, color: string) {
    return (
      <TreeRow
        key={lesson.id}
        dark={dark}
        noun="lesson"
        label={lesson.title}
        icon={lesson.icon}
        fallbackIcon={LESSON_FALLBACK_ICON}
        color={color}
        indent={48}
        active={editor.kind === 'lesson' && editor.id === lesson.id}
        onEdit={() => editLesson(lesson, subject)}
        onDelete={() => setDeleteTarget({ kind: 'lesson', id: lesson.id })}
      />
    )
  }

  function renderSubject(subject: AdminSubject) {
    const open = openSubjectId === subject.id
    const subjectLessons = lessons.filter(l => l.subject_id === subject.id)
    const color = subject.color || SUBJECT_DEFAULTS.color
    return (
      <Fragment key={subject.id}>
        <TreeRow
          dark={dark}
          noun="subject"
          label={subject.name}
          icon={subject.icon}
          fallbackIcon={SUBJECT_DEFAULTS.icon}
          color={color}
          indent={24}
          count={subjectLessons.length}
          open={open}
          active={editor.kind === 'subject' && editor.id === subject.id}
          onToggle={() => toggleSubject(subject)}
          onEdit={() => editSubject(subject, subject.module_id)}
          onDelete={() => setDeleteTarget({ kind: 'subject', id: subject.id })}
        />
        {open && (
          <>
            <QuickAddRow
              dark={dark}
              indent={48}
              placeholder={`Add lessons to ${subject.name} — Enter to add, paste a list for many`}
              onAdd={names => quickAddLessons(subject, names)}
              onDetails={() => editLesson(null, subject)}
            />
            {subjectLessons.map(lesson => renderLesson(lesson, subject, color))}
          </>
        )}
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
          fallbackIcon={MODULE_DEFAULTS.icon}
          color={mod.color}
          indent={0}
          count={moduleSubjects.length}
          open={open}
          badge={mod.status === 'active' ? undefined : 'Completed'}
          active={(editor.kind === 'module' && editor.id === mod.id) || (editor.kind === 'stages' && editor.moduleId === mod.id)}
          actions={
            <button type="button" onClick={() => editStages(mod)} aria-label={`Exam stages for ${mod.name}`} title="Exam stages" style={miniBtn(pt.sub)}>
              <TargetIcon color={pt.sub} size={12} />
            </button>
          }
          onToggle={() => toggleModule(mod.id)}
          onEdit={() => editModule(mod)}
          onDelete={() => setDeleteTarget({ kind: 'module', id: mod.id })}
        />
        {open && (
          <>
            <QuickAddRow
              dark={dark}
              indent={24}
              placeholder={`Add subjects to ${mod.name} — Enter to add, paste a list for many`}
              onAdd={names => quickAddSubjects(mod, names)}
              onDetails={() => editSubject(null, mod.id)}
            />
            {moduleSubjects.map(renderSubject)}
          </>
        )}
      </Fragment>
    )
  }

  const list = (
    <div>
      {loading && <CardRowsSkeleton count={4} label="Loading structure" />}
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
