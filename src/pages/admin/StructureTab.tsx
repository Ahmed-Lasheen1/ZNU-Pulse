import { useState, type CSSProperties } from 'react'
import { ChevronDown } from 'lucide-react'
import { getPulseTheme } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/pulse/EmptyState'
import { ModuleIcon } from '../../lib/medicalIcons'
import AdminSplitLayout from './AdminSplitLayout'
import AdminRow from './AdminRow'
import ModuleForm from './ModuleForm'
import SubjectForm from './SubjectForm'
import LessonForm from './LessonForm'
import StagesPanel from './StagesPanel'
import { miniBtn } from './adminStyles'
import { useAdminMessage } from './useAdminMessage'
import { deleteAdminEntity } from './useAdminEntityCrud'
import { PlusIcon, TargetIcon, ConstructionIcon } from '../../components/ui/tool-icons'
import type { AdminModule, AdminSubject, AdminLesson } from './adminTypes'

type Editor =
  | { kind: 'module'; id: string | null }
  | { kind: 'subject'; id: string | null; moduleId: string }
  | { kind: 'lesson'; id: string | null; moduleId: string; subjectId: string }
  | { kind: 'stages'; moduleId: string }

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

const NEW_MODULE: Editor = { kind: 'module', id: null }

const toggleStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: 0,
  background: 'transparent', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit',
}

export default function StructureTab({ dark, modules, subjects, lessons, loading, refresh }: StructureTabProps) {
  const pt = getPulseTheme(dark)
  const { message, showMessage } = useAdminMessage()
  const [editor, setEditor] = useState<Editor>(NEW_MODULE)
  const [openModuleId, setOpenModuleId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  async function confirmDelete() {
    if (!deleteTarget) return
    const { kind, id } = deleteTarget
    const copy = DELETE_COPY[kind]
    setDeleteTarget(null)
    const error = await deleteAdminEntity(copy.table, id)
    showMessage(error ? '❌ ' + error.message : `✅ ${copy.label} deleted`)
    if (error) return
    setEditor(NEW_MODULE)
    if (kind === 'module' && openModuleId === id) setOpenModuleId(null)
    await refresh()
  }

  function renderForm() {
    if (editor.kind === 'module') {
      return (
        <ModuleForm
          key={`module-${editor.id}`}
          dark={dark}
          module={modules.find(m => m.id === editor.id) ?? null}
          modules={modules}
          showMessage={showMessage}
          onSaved={refresh}
          onDone={() => setEditor(NEW_MODULE)}
        />
      )
    }

    const parent = modules.find(m => m.id === editor.moduleId)
    if (!parent) return null

    if (editor.kind === 'stages') {
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

    if (editor.kind === 'subject') {
      return (
        <SubjectForm
          key={`subject-${editor.id}-${parent.id}`}
          dark={dark}
          subject={subjects.find(s => s.id === editor.id) ?? null}
          module={parent}
          subjects={subjects}
          showMessage={showMessage}
          onSaved={refresh}
          onDone={() => setEditor({ kind: 'subject', id: null, moduleId: parent.id })}
        />
      )
    }

    const subject = subjects.find(s => s.id === editor.subjectId)
    if (!subject) return null
    return (
      <LessonForm
        key={`lesson-${editor.id}-${subject.id}`}
        dark={dark}
        lesson={lessons.find(l => l.id === editor.id) ?? null}
        module={parent}
        subject={subject}
        showMessage={showMessage}
        onSaved={refresh}
        onDone={() => setEditor({ kind: 'lesson', id: null, moduleId: parent.id, subjectId: subject.id })}
      />
    )
  }

  function renderLesson(lesson: AdminLesson) {
    return (
      <div key={lesson.id} style={{ marginLeft: 40 }}>
        <AdminRow
          dark={dark}
          noun="lesson"
          label={lesson.title}
          active={editor.kind === 'lesson' && editor.id === lesson.id}
          onEdit={() => setEditor({ kind: 'lesson', id: lesson.id, moduleId: lesson.module_id, subjectId: lesson.subject_id })}
          onDelete={() => setDeleteTarget({ kind: 'lesson', id: lesson.id })}
        >
          <ModuleIcon value={lesson.icon || '📘'} size={16} color="#34d399" />
          <span style={{ color: pt.text, fontWeight: 600 }}>{lesson.title}</span>
        </AdminRow>
      </div>
    )
  }

  function renderSubject(subject: AdminSubject) {
    const subjectLessons = lessons.filter(l => l.subject_id === subject.id)
    return (
      <div key={subject.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ marginLeft: 20 }}>
          <AdminRow
            dark={dark}
            noun="subject"
            label={subject.name}
            active={editor.kind === 'subject' && editor.id === subject.id}
            actions={
              <button
                onClick={() => setEditor({ kind: 'lesson', id: null, moduleId: subject.module_id, subjectId: subject.id })}
                aria-label={`Add lesson to ${subject.name}`}
                style={miniBtn(pt.cobalt)}
              >
                <PlusIcon color={pt.cobalt} size={12} /> Lesson
              </button>
            }
            onEdit={() => setEditor({ kind: 'subject', id: subject.id, moduleId: subject.module_id })}
            onDelete={() => setDeleteTarget({ kind: 'subject', id: subject.id })}
          >
            <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, background: subject.color || '#34d399' }} />
            <ModuleIcon value={subject.icon || '📖'} size={16} color={subject.color || '#34d399'} />
            <span style={{ color: pt.text, fontWeight: 600 }}>{subject.name}</span>
            <span style={{ color: pt.textMuted, fontSize: 12 }}>· {subject.type}</span>
          </AdminRow>
        </div>
        {subjectLessons.map(renderLesson)}
      </div>
    )
  }

  function renderModule(mod: AdminModule) {
    const open = openModuleId === mod.id
    const moduleSubjects = subjects.filter(s => s.module_id === mod.id)
    return (
      <div key={mod.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AdminRow
          dark={dark}
          noun="module"
          label={mod.name}
          active={(editor.kind === 'module' && editor.id === mod.id) || (editor.kind === 'stages' && editor.moduleId === mod.id)}
          actions={
            <>
              <button
                onClick={() => setEditor({ kind: 'stages', moduleId: mod.id })}
                aria-label={`Edit stages of ${mod.name}`}
                style={miniBtn(pt.indigo)}
              >
                <TargetIcon color={pt.indigo} size={12} /> Stages
              </button>
              <button
                onClick={() => { setOpenModuleId(mod.id); setEditor({ kind: 'subject', id: null, moduleId: mod.id }) }}
                aria-label={`Add subject to ${mod.name}`}
                style={miniBtn(pt.cobalt)}
              >
                <PlusIcon color={pt.cobalt} size={12} /> Subject
              </button>
            </>
          }
          onEdit={() => setEditor({ kind: 'module', id: mod.id })}
          onDelete={() => setDeleteTarget({ kind: 'module', id: mod.id })}
        >
          <button type="button" onClick={() => setOpenModuleId(open ? null : mod.id)} aria-expanded={open} style={toggleStyle}>
            <ChevronDown size={14} color={pt.textMuted} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
            <ModuleIcon value={mod.icon} size={22} color={mod.color} />
            <span style={{ color: mod.color, fontWeight: 700 }}>{mod.name}</span>
            <span style={{ color: pt.textMuted, fontSize: 12 }}>({moduleSubjects.length})</span>
          </button>
          {mod.status !== 'active' && (
            <span style={{
              color: pt.textMuted, border: `1px solid ${pt.border}`, borderRadius: 999,
              padding: '1px 8px', fontSize: 11, fontWeight: 700
            }}>Completed</span>
          )}
        </AdminRow>
        {open && moduleSubjects.map(renderSubject)}
      </div>
    )
  }

  const list = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setEditor(NEW_MODULE)} style={miniBtn(pt.cobalt)}>
          <PlusIcon color={pt.cobalt} size={12} /> Module
        </button>
      </div>

      {loading && <EmptyState dark={dark} message="Loading..." />}
      {!loading && modules.length === 0 && (
        <EmptyState dark={dark} message={<><ConstructionIcon color={pt.sub} size={14} /> No modules yet — add one on the left</>} />
      )}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {modules.map(renderModule)}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <InlineMessage message={message} />
      <AdminSplitLayout formWidth={420} form={renderForm()} list={list} />
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
