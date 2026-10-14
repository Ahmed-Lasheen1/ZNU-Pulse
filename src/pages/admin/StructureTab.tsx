import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import ConfirmDialog from '../../components/ConfirmDialog'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import { CardRowsSkeleton } from '../../components/pulse/Skeletons'
import { useToast } from '../../components/ToastProvider'
import { fetchLessonStageMap } from '../../lib/lessonStages'
import ModuleForm from './ModuleForm'
import SubjectForm from './SubjectForm'
import LessonForm from './LessonForm'
import StagesPanel from './StagesPanel'
import QuickAddRow from './QuickAddRow'
import { StructureColumn, StructureRow } from './StructureColumn'
import { useStageOptions } from './useStageOptions'
import { miniBtn, inStyle as adminInStyle } from './adminStyles'
import { deleteAdminEntity } from './useAdminEntityCrud'
import { SUBJECT_DEFAULTS, MODULE_DEFAULTS, LESSON_FALLBACK_ICON, normalizeName, freshNames, plural } from './adminHelpers'
import { TargetIcon, PackageIcon, BookIcon, ListIcon, SearchIcon2 } from '../../components/ui/tool-icons'
import type { AdminModule, AdminSubject, AdminLesson, AdminContext } from './adminTypes'

type EntityKind = 'module' | 'subject' | 'lesson'
type ColumnView = 'modules' | 'subjects' | 'lessons'

type Editor =
  | { kind: 'none' }
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

const NONE: Editor = { kind: 'none' }

const ENTITY_COPY: Record<EntityKind, { table: string; field: 'name' | 'title'; label: string; deleteMessage: string }> = {
  module: {
    table: 'modules',
    field: 'name',
    label: 'Module',
    deleteMessage: 'This will also permanently delete all its subjects, files, schedules, questions and summaries. This cannot be undone.',
  },
  subject: {
    table: 'subjects',
    field: 'name',
    label: 'Subject',
    deleteMessage: 'Its files, lessons and questions will also be deleted. This cannot be undone.',
  },
  lesson: {
    table: 'lessons',
    field: 'title',
    label: 'Lesson',
    deleteMessage: 'Questions tagged to it keep their module/subject tags but lose the lesson link. This cannot be undone.',
  },
}

function editorTouches(editor: Editor, id: string) {
  if (editor.kind === 'none') return false
  if (editor.kind === 'module') return editor.id === id
  if (editor.kind === 'subject') return editor.id === id || editor.moduleId === id
  if (editor.kind === 'lesson') return editor.id === id || editor.subjectId === id
  return editor.moduleId === id
}

function initialView(context: AdminContext): ColumnView {
  if (context.subjectId) return 'lessons'
  if (context.moduleId) return 'subjects'
  return 'modules'
}

export default function StructureTab({ dark, modules, subjects, lessons, context, loading, refresh }: StructureTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void
  const showMessage = useCallback(
    (text: string) => showToast(text, text.startsWith('❌') ? 'error' : 'success'),
    [showToast]
  )

  const [editor, setEditor] = useState<Editor>(NONE)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [view, setView] = useState<ColumnView>(() => initialView(context))
  const [search, setSearch] = useState('')
  const [stageMap, setStageMap] = useState<Record<string, string[]>>({})
  const editorRef = useRef<HTMLDivElement>(null)
  const stageOptions = useStageOptions(context.moduleId)

  useEffect(() => {
    let ignore = false
    fetchLessonStageMap().then(({ map }) => { if (!ignore) setStageMap(map) })
    return () => { ignore = true }
  }, [lessons])

  useEffect(() => {
    if (editor.kind === 'none') return
    if (window.matchMedia('(max-width: 1359px)').matches) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editor])

  const selectedModule = modules.find(m => m.id === context.moduleId) ?? null
  const selectedSubject = subjects.find(s => s.id === context.subjectId) ?? null
  const moduleSubjects = useMemo(() => subjects.filter(s => s.module_id === context.moduleId), [subjects, context.moduleId])
  const subjectLessons = useMemo(() => lessons.filter(l => l.subject_id === context.subjectId), [lessons, context.subjectId])

  const subjectCountByModule = useMemo(() => {
    const counts: Record<string, number> = {}
    subjects.forEach(s => { counts[s.module_id] = (counts[s.module_id] || 0) + 1 })
    return counts
  }, [subjects])

  const lessonCountBySubject = useMemo(() => {
    const counts: Record<string, number> = {}
    lessons.forEach(l => { counts[l.subject_id] = (counts[l.subject_id] || 0) + 1 })
    return counts
  }, [lessons])

  const searchTerm = normalizeName(search)
  const searchResults = searchTerm.length >= 2
    ? lessons.filter(l => normalizeName(l.title).includes(searchTerm)).slice(0, 8)
    : []

  function selectModule(id: string) {
    context.setContext({ moduleId: id, subjectId: '', lessonId: '' })
    setView('subjects')
    setEditor(NONE)
  }

  function selectSubject(subject: AdminSubject) {
    context.setContext({ moduleId: subject.module_id, subjectId: subject.id, lessonId: '' })
    setView('lessons')
    setEditor(NONE)
  }

  function selectLesson(lesson: AdminLesson) {
    context.setContext({ moduleId: lesson.module_id, subjectId: lesson.subject_id, lessonId: lesson.id })
    setEditor(NONE)
  }

  function jumpTo(lesson: AdminLesson) {
    selectLesson(lesson)
    setView('lessons')
    setSearch('')
  }

  async function renameEntity(kind: EntityKind, id: string, value: string) {
    const copy = ENTITY_COPY[kind]
    let siblings: { id: string; name: string }[] = []
    let current = ''

    if (kind === 'module') {
      siblings = modules.map(m => ({ id: m.id, name: m.name }))
      current = modules.find(m => m.id === id)?.name ?? ''
    } else if (kind === 'subject') {
      const subject = subjects.find(s => s.id === id)
      siblings = subjects.filter(s => s.module_id === subject?.module_id).map(s => ({ id: s.id, name: s.name }))
      current = subject?.name ?? ''
    } else {
      const lesson = lessons.find(l => l.id === id)
      siblings = lessons.filter(l => l.subject_id === lesson?.subject_id).map(l => ({ id: l.id, name: l.title }))
      current = lesson?.title ?? ''
    }

    if (value === current) return true
    if (siblings.some(s => s.id !== id && normalizeName(s.name) === normalizeName(value))) {
      showMessage(`❌ ${copy.label} name already exists here`)
      return false
    }

    const { error } = await supabase.from(copy.table).update({ [copy.field]: value }).eq('id', id)
    if (error) {
      showMessage('❌ ' + error.message)
      return false
    }
    showMessage(`✅ ${copy.label} renamed`)
    await refresh()
    return true
  }

  async function quickInsert(
    table: 'modules' | 'subjects' | 'lessons',
    noun: string,
    names: string[],
    existingNames: string[],
    build: (name: string, createdAt: string) => Record<string, unknown>,
    direction: 1 | -1 = 1
  ) {
    const fresh = freshNames(names, new Set(existingNames.map(normalizeName)))
    if (fresh.length === 0) {
      showMessage('❌ Already exists here')
      return false
    }
    const base = Date.now()
    const { error } = await supabase.from(table).insert(fresh.map((name, i) => build(name, new Date(base + i * direction).toISOString())))
    if (error) {
      showMessage('❌ ' + error.message)
      return false
    }
    const skipped = names.length - fresh.length
    showMessage(`✅ ${plural(fresh.length, noun)} added${skipped > 0 ? ` (${skipped} already existed)` : ''}`)
    await refresh()
    return true
  }

  function quickAddModules(names: string[]) {
    return quickInsert(
      'modules', 'module', names,
      modules.map(m => m.name),
      (name, createdAt) => ({
        name, color: MODULE_DEFAULTS.color, icon: MODULE_DEFAULTS.icon, status: MODULE_DEFAULTS.status, created_at: createdAt,
      }),
      -1
    )
  }

  function quickAddSubjects(module: AdminModule, names: string[]) {
    return quickInsert(
      'subjects', 'subject', names,
      subjects.filter(s => s.module_id === module.id).map(s => s.name),
      (name, createdAt) => ({
        name, module_id: module.id, type: SUBJECT_DEFAULTS.type,
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
    const copy = ENTITY_COPY[kind]
    setDeleteTarget(null)
    const error = await deleteAdminEntity(copy.table, id)
    showMessage(error ? '❌ ' + error.message : `✅ ${copy.label} deleted`)
    if (error) return

    if (editorTouches(editor, id)) setEditor(NONE)
    if (kind === 'module' && context.moduleId === id) {
      context.setContext({ moduleId: '', subjectId: '', lessonId: '' })
      setView('modules')
    } else if (kind === 'subject' && context.subjectId === id) {
      context.setContext({ moduleId: context.moduleId, subjectId: '', lessonId: '' })
      setView('subjects')
    } else if (kind === 'lesson' && context.lessonId === id) {
      context.setContext({ moduleId: context.moduleId, subjectId: context.subjectId, lessonId: '' })
    }
    await refresh()
  }

  function renderForm() {
    const common = { dark, showMessage, onSaved: refresh, onDone: () => setEditor(NONE) }

    if (editor.kind === 'module') {
      const module = editor.id ? modules.find(m => m.id === editor.id) ?? null : null
      return <ModuleForm key={`module-${editor.id ?? 'new'}`} {...common} module={module} modules={modules} />
    }

    if (editor.kind === 'subject') {
      const subject = editor.id ? subjects.find(s => s.id === editor.id) ?? null : null
      const parent = modules.find(m => m.id === (subject ? subject.module_id : editor.moduleId))
      if (parent) {
        return <SubjectForm key={`subject-${editor.id ?? `new-${parent.id}`}`} {...common} subject={subject} module={parent} subjects={subjects} />
      }
    }

    if (editor.kind === 'lesson') {
      const lesson = editor.id ? lessons.find(l => l.id === editor.id) ?? null : null
      const subject = subjects.find(s => s.id === (lesson ? lesson.subject_id : editor.subjectId))
      const parent = modules.find(m => m.id === subject?.module_id)
      if (subject && parent) {
        return <LessonForm key={`lesson-${editor.id ?? `new-${subject.id}`}`} {...common} lesson={lesson} module={parent} subject={subject} />
      }
    }

    if (editor.kind === 'stages') {
      const parent = modules.find(m => m.id === editor.moduleId)
      if (parent) {
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
    }

    return (
      <div className="st-hint">
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: '22px 24px' }}>
          <p style={{ color: pt.textMuted, fontSize: 13, lineHeight: 1.7 }}>
            Select a module, subject or lesson, then use Rename for a quick name change or Details for its icon, color and exam stages.
            Use the Add box under each column to create new items. Paste a list to add many at once.
          </p>
        </LiquidGlassCard>
      </div>
    )
  }

  const hover = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)'

  return (
    <div>
      <style>{`
        .st-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
        .st-columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: start; }
        .st-col { min-width: 0; }
        .st-col-body { max-height: calc(100dvh - 420px); min-height: 140px; overflow-y: auto; padding: 0 2px; }
        .st-row { border: 1px solid transparent; border-radius: 12px; padding: 6px 8px; margin-bottom: 4px; transition: background 0.15s ease, border-color 0.15s ease; }
        .st-row:hover { background: ${hover}; }
        .st-row-main {
          display: flex; align-items: center; gap: 8px; width: 100%; padding: 4px 2px;
          background: transparent; border: none; border-radius: 8px; text-align: left; cursor: pointer; font: inherit; color: inherit;
        }
        .st-crumbs { display: none; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .st-hint { display: none; }
        @media (min-width: 1360px) {
          .st-layout { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 24px; }
          .st-editor { position: sticky; top: 96px; max-height: calc(100dvh - 116px); overflow-y: auto; padding: 4px; }
          .st-hint { display: block; }
        }
        @media (max-width: 760px) {
          .st-columns { grid-template-columns: minmax(0, 1fr); }
          .st-col { display: none; }
          .st-columns[data-view="modules"] .st-col[data-level="modules"],
          .st-columns[data-view="subjects"] .st-col[data-level="subjects"],
          .st-columns[data-view="lessons"] .st-col[data-level="lessons"] { display: block; }
          .st-crumbs { display: flex; }
          .st-col-body { max-height: none; }
        }
      `}</style>

      {loading ? (
        <CardRowsSkeleton count={4} label="Loading structure" />
      ) : (
        <>
          <div style={{ position: 'relative', marginBottom: searchResults.length > 0 ? 8 : 16 }}>
            <input
              placeholder="Jump to a lesson..."
              aria-label="Search lessons"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inStyle, marginBottom: 0, paddingLeft: 34 }}
            />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <SearchIcon2 color={pt.faint} size={14} />
            </span>
          </div>

          {searchTerm.length >= 2 && (
            <div style={{ marginBottom: 16 }}>
              <LiquidGlassCard dark={dark} delay={0} style={{ padding: '8px 10px' }}>
                {searchResults.length === 0 && (
                  <p style={{ color: pt.textMuted, fontSize: 12.5, padding: '6px' }}>No lessons match.</p>
                )}
                {searchResults.map(lesson => {
                  const subject = subjects.find(s => s.id === lesson.subject_id)
                  const module = modules.find(m => m.id === lesson.module_id)
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      className="st-row-main st-row glass-focus-ring"
                      onClick={() => jumpTo(lesson)}
                      style={{ display: 'block', width: '100%' }}
                    >
                      <div style={{ color: pt.text, fontWeight: 700, fontSize: 13, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{lesson.title}</div>
                      <div style={{ color: pt.textMuted, fontSize: 11, marginTop: 2 }}>
                        {[module?.name, subject?.name].filter(Boolean).join(' › ')}
                      </div>
                    </button>
                  )
                })}
              </LiquidGlassCard>
            </div>
          )}

          <div className="st-crumbs">
            <button type="button" onClick={() => setView('modules')} style={miniBtn(view === 'modules' ? pt.cobalt : pt.sub)}>Modules</button>
            {selectedModule && (
              <>
                <span style={{ color: pt.textMuted }}>›</span>
                <button type="button" onClick={() => setView('subjects')} style={miniBtn(view === 'subjects' ? pt.cobalt : pt.sub)}>{selectedModule.name}</button>
              </>
            )}
            {selectedModule && selectedSubject && view === 'lessons' && (
              <>
                <span style={{ color: pt.textMuted }}>›</span>
                <span style={{ color: pt.cobalt, fontWeight: 700, fontSize: 12 }}>{selectedSubject.name}</span>
              </>
            )}
          </div>

          <div className="st-layout">
            <div className="st-columns" data-view={view}>
              <StructureColumn
                dark={dark}
                level="modules"
                title="Modules"
                Icon={PackageIcon}
                count={modules.length}
                emptyMessage="No modules yet. Add one below."
                isEmpty={modules.length === 0}
                footer={
                  <QuickAddRow
                    dark={dark}
                    indent={0}
                    placeholder="Add module"
                    onAdd={quickAddModules}
                    onDetails={() => setEditor({ kind: 'module', id: null })}
                  />
                }
              >
                {modules.map(mod => (
                  <StructureRow
                    key={mod.id}
                    dark={dark}
                    noun="module"
                    label={mod.name}
                    icon={mod.icon}
                    fallbackIcon={MODULE_DEFAULTS.icon}
                    color={mod.color}
                    selected={mod.id === context.moduleId}
                    meta={String(subjectCountByModule[mod.id] || 0)}
                    badge={mod.status === 'active' ? undefined : 'Completed'}
                    onSelect={() => selectModule(mod.id)}
                    onRename={name => renameEntity('module', mod.id, name)}
                    onDetails={() => setEditor({ kind: 'module', id: mod.id })}
                    onDelete={() => setDeleteTarget({ kind: 'module', id: mod.id })}
                    extraActions={
                      <button
                        type="button"
                        onClick={() => setEditor({ kind: 'stages', moduleId: mod.id })}
                        aria-label={`Exam stages for ${mod.name}`}
                        style={miniBtn(pt.sub)}
                      >
                        <TargetIcon color={pt.sub} size={12} /> Stages
                      </button>
                    }
                  />
                ))}
              </StructureColumn>

              <StructureColumn
                dark={dark}
                level="subjects"
                title="Subjects"
                subtitle={selectedModule?.name}
                Icon={BookIcon}
                count={moduleSubjects.length}
                disabledMessage={selectedModule ? undefined : 'Select a module to see its subjects.'}
                emptyMessage="No subjects yet. Add one below."
                isEmpty={moduleSubjects.length === 0}
                footer={selectedModule && (
                  <QuickAddRow
                    dark={dark}
                    indent={0}
                    placeholder="Add subject"
                    onAdd={names => quickAddSubjects(selectedModule, names)}
                    onDetails={() => setEditor({ kind: 'subject', id: null, moduleId: selectedModule.id })}
                  />
                )}
              >
                {moduleSubjects.map(subject => (
                  <StructureRow
                    key={subject.id}
                    dark={dark}
                    noun="subject"
                    label={subject.name}
                    icon={subject.icon}
                    fallbackIcon={SUBJECT_DEFAULTS.icon}
                    color={subject.color || SUBJECT_DEFAULTS.color}
                    selected={subject.id === context.subjectId}
                    meta={String(lessonCountBySubject[subject.id] || 0)}
                    onSelect={() => selectSubject(subject)}
                    onRename={name => renameEntity('subject', subject.id, name)}
                    onDetails={() => setEditor({ kind: 'subject', id: subject.id, moduleId: subject.module_id })}
                    onDelete={() => setDeleteTarget({ kind: 'subject', id: subject.id })}
                  />
                ))}
              </StructureColumn>

              <StructureColumn
                dark={dark}
                level="lessons"
                title="Lessons"
                subtitle={selectedSubject?.name}
                Icon={ListIcon}
                count={subjectLessons.length}
                disabledMessage={selectedSubject ? undefined : 'Select a subject to see its lessons.'}
                emptyMessage="No lessons yet. Add one below."
                isEmpty={subjectLessons.length === 0}
                footer={selectedSubject && (
                  <QuickAddRow
                    dark={dark}
                    indent={0}
                    placeholder="Add lesson"
                    onAdd={names => quickAddLessons(selectedSubject, names)}
                    onDetails={() => setEditor({ kind: 'lesson', id: null, subjectId: selectedSubject.id })}
                  />
                )}
              >
                {subjectLessons.map(lesson => (
                  <StructureRow
                    key={lesson.id}
                    dark={dark}
                    noun="lesson"
                    label={lesson.title}
                    icon={lesson.icon}
                    fallbackIcon={LESSON_FALLBACK_ICON}
                    color={selectedSubject?.color || SUBJECT_DEFAULTS.color}
                    selected={lesson.id === context.lessonId}
                    chips={(stageMap[lesson.id] || []).map(value => {
                      const option = stageOptions.find(o => o.value === value)
                      return { label: option?.label ?? value, color: option?.color ?? '#64748b' }
                    })}
                    onSelect={() => selectLesson(lesson)}
                    onRename={name => renameEntity('lesson', lesson.id, name)}
                    onDetails={() => setEditor({ kind: 'lesson', id: lesson.id, subjectId: lesson.subject_id })}
                    onDelete={() => setDeleteTarget({ kind: 'lesson', id: lesson.id })}
                  />
                ))}
              </StructureColumn>
            </div>

            <div className="st-editor" ref={editorRef}>
              {editor.kind !== 'none' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button type="button" onClick={() => setEditor(NONE)} style={miniBtn(pt.sub)}>Close editor</button>
                </div>
              )}
              {renderForm()}
            </div>
          </div>
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
