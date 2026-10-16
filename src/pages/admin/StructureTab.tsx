import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import ConfirmDialog from '../../components/ConfirmDialog'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import { CardRowsSkeleton } from '../../components/pulse/Skeletons'
import { useToast } from '../../components/ToastProvider'
import { fetchLessonStageMap } from '../../lib/lessonStages'
import { useBodyScrollLock } from '../../lib/useBodyScrollLock'
import ModuleForm from './ModuleForm'
import SubjectForm from './SubjectForm'
import LessonForm from './LessonForm'
import StagesPanel from './StagesPanel'
import QuickAddRow from './QuickAddRow'
import TreeRow from './TreeRow'
import { useStageOptions } from './useStageOptions'
import { miniBtn, inStyle as adminInStyle } from './adminStyles'
import { deleteAdminEntity } from './useAdminEntityCrud'
import { SUBJECT_DEFAULTS, MODULE_DEFAULTS, LESSON_FALLBACK_ICON, normalizeName, freshNames, plural } from './adminHelpers'
import { TargetIcon, SearchIcon2 } from '../../components/ui/tool-icons'
import type { AdminModule, AdminSubject, AdminLesson, AdminContext } from './adminTypes'

type EntityKind = 'module' | 'subject' | 'lesson'

type Editor =
  | { kind: 'none' }
  | { kind: 'module'; id: string | null }
  | { kind: 'subject'; id: string | null; moduleId: string }
  | { kind: 'lesson'; id: string | null; subjectId: string }
  | { kind: 'stages'; moduleId: string }

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

const NONE: Editor = { kind: 'none' }
const NO_SELECTION = { moduleId: '', subjectId: '', lessonId: '' }

const ENTITY_COPY: Record<EntityKind, { table: string; field: 'name' | 'title'; label: string; deleteMessage: string }> = {
  module: {
    table: 'modules', field: 'name', label: 'Module',
    deleteMessage: 'This will also permanently delete all its subjects, files, schedules, questions and summaries. This cannot be undone.',
  },
  subject: {
    table: 'subjects', field: 'name', label: 'Subject',
    deleteMessage: 'Its files, lessons and questions will also be deleted. This cannot be undone.',
  },
  lesson: {
    table: 'lessons', field: 'title', label: 'Lesson',
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

function EditorModal({ dark, onClose, children }: { dark: boolean; onClose: () => void; children: React.ReactNode }) {
  const pt = getPulseTheme(dark)
  useBodyScrollLock(true)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return createPortal(
    <div
      role="presentation"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 3500, overflowY: 'auto',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 'clamp(12px, 4vh, 40px) 12px',
      }}
    >
      <div role="dialog" aria-modal="true" style={{ width: '100%', maxWidth: 680 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button type="button" onClick={onClose} style={{ ...miniBtn(pt.sub), background: dark ? 'rgba(20,32,54,0.7)' : 'rgba(255,255,255,0.8)' }}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
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
  const [search, setSearch] = useState('')
  const [stageMap, setStageMap] = useState<Record<string, string[]>>({})
  const stageOptions = useStageOptions(context.moduleId)

  useEffect(() => {
    let ignore = false
    fetchLessonStageMap().then(({ map }) => { if (!ignore) setStageMap(map) })
    return () => { ignore = true }
  }, [lessons])

  // Which module/subject is open comes straight from the shared admin context,
  // so the other admin tabs open on whatever was last expanded here.
  const { moduleId, subjectId, lessonId } = context

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

  const searchTerm = normalizeName(search)
  const searchResults = searchTerm.length >= 2
    ? lessons.filter(l => normalizeName(l.title).includes(searchTerm)).slice(0, 8)
    : []

  function toggleModule(id: string) {
    context.setContext(moduleId === id ? NO_SELECTION : { moduleId: id, subjectId: '', lessonId: '' })
  }
  function toggleSubject(subject: AdminSubject) {
    context.setContext(
      subjectId === subject.id
        ? { moduleId: subject.module_id, subjectId: '', lessonId: '' }
        : { moduleId: subject.module_id, subjectId: subject.id, lessonId: '' }
    )
  }
  function selectLesson(lesson: AdminLesson) {
    context.setContext({ moduleId: lesson.module_id, subjectId: lesson.subject_id, lessonId: lesson.id })
  }
  function jumpTo(lesson: AdminLesson) {
    selectLesson(lesson)
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
    if (error) { showMessage('❌ ' + error.message); return false }
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
    if (fresh.length === 0) { showMessage('❌ Already exists here'); return false }
    const base = Date.now()
    const { error } = await supabase.from(table).insert(fresh.map((name, i) => build(name, new Date(base + i * direction).toISOString())))
    if (error) { showMessage('❌ ' + error.message); return false }
    const skipped = names.length - fresh.length
    showMessage(`✅ ${plural(fresh.length, noun)} added${skipped > 0 ? ` (${skipped} already existed)` : ''}`)
    await refresh()
    return true
  }

  const quickAddModules = (names: string[]) => quickInsert(
    'modules', 'module', names, modules.map(m => m.name),
    (name, createdAt) => ({ name, color: MODULE_DEFAULTS.color, icon: MODULE_DEFAULTS.icon, status: MODULE_DEFAULTS.status, created_at: createdAt }),
    -1
  )

  const quickAddSubjects = (module: AdminModule, names: string[]) => quickInsert(
    'subjects', 'subject', names, subjects.filter(s => s.module_id === module.id).map(s => s.name),
    (name, createdAt) => ({
      name, module_id: module.id, type: SUBJECT_DEFAULTS.type,
      icon: SUBJECT_DEFAULTS.icon, color: SUBJECT_DEFAULTS.color, created_at: createdAt,
    })
  )

  const quickAddLessons = (subject: AdminSubject, names: string[]) => quickInsert(
    'lessons', 'lesson', names, lessons.filter(l => l.subject_id === subject.id).map(l => l.title),
    (title, createdAt) => ({ title, subject_id: subject.id, module_id: subject.module_id, icon: null, created_at: createdAt })
  )

  async function confirmDelete() {
    if (!deleteTarget) return
    const { kind, id } = deleteTarget
    const copy = ENTITY_COPY[kind]
    setDeleteTarget(null)
    const error = await deleteAdminEntity(copy.table, id)
    showMessage(error ? '❌ ' + error.message : `✅ ${copy.label} deleted`)
    if (error) return

    if (editorTouches(editor, id)) setEditor(NONE)
    if (kind === 'module' && moduleId === id) context.setContext(NO_SELECTION)
    else if (kind === 'subject' && subjectId === id) context.setContext({ moduleId, subjectId: '', lessonId: '' })
    else if (kind === 'lesson' && lessonId === id) context.setContext({ moduleId, subjectId, lessonId: '' })
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
      if (parent) return <SubjectForm key={`subject-${editor.id ?? `new-${parent.id}`}`} {...common} subject={subject} module={parent} subjects={subjects} />
    }

    if (editor.kind === 'lesson') {
      const lesson = editor.id ? lessons.find(l => l.id === editor.id) ?? null : null
      const subject = subjects.find(s => s.id === (lesson ? lesson.subject_id : editor.subjectId))
      const parent = modules.find(m => m.id === subject?.module_id)
      if (subject && parent) return <LessonForm key={`lesson-${editor.id ?? `new-${subject.id}`}`} {...common} lesson={lesson} module={parent} subject={subject} />
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
    return null
  }

  const form = renderForm()
  const hover = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        .st-row { border: 1px solid transparent; border-radius: 12px; padding: 4px 6px; transition: background 0.15s ease; }
        .st-row:hover { background: ${hover}; }
        .st-row-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .st-row-main {
          display: flex; align-items: center; gap: 8px; flex: 1 1 200px; min-width: 0; padding: 6px 2px;
          background: transparent; border: none; border-radius: 8px; text-align: left; cursor: pointer; font: inherit; color: inherit;
        }
        .st-row-actions { display: flex; gap: 6px; flex-shrink: 0; margin-left: auto; }
        .st-children { margin: 2px 0 8px 18px; padding-left: 10px; border-left: 2px solid var(--st-line); }
      `}</style>

      {loading ? (
        <CardRowsSkeleton count={4} variant="tree" label="Loading structure" />
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
                {searchResults.length === 0 && <p style={{ color: pt.textMuted, fontSize: 12.5, padding: 6 }}>No lessons match.</p>}
                {searchResults.map(lesson => (
                  <button
                    key={lesson.id}
                    type="button"
                    className="st-row st-row-main glass-focus-ring"
                    onClick={() => jumpTo(lesson)}
                    style={{ display: 'block', width: '100%', flex: 'none' }}
                  >
                    <div style={{ color: pt.text, fontWeight: 700, fontSize: 13, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{lesson.title}</div>
                    <div style={{ color: pt.textMuted, fontSize: 11, marginTop: 2 }}>
                      {[modules.find(m => m.id === lesson.module_id)?.name, subjects.find(s => s.id === lesson.subject_id)?.name].filter(Boolean).join(' › ')}
                    </div>
                  </button>
                ))}
              </LiquidGlassCard>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {modules.length === 0 && (
              <p style={{ color: pt.textMuted, fontSize: 13, textAlign: 'center', padding: 16 }}>No modules yet. Add one below.</p>
            )}

            {modules.map(mod => {
              const moduleOpen = mod.id === moduleId
              const modSubjects = subjects.filter(s => s.module_id === mod.id)
              return (
                <LiquidGlassCard key={mod.id} dark={dark} delay={0} style={{ padding: '8px 10px' }}>
                  <TreeRow
                    dark={dark}
                    noun="module"
                    label={mod.name}
                    icon={mod.icon}
                    fallbackIcon={MODULE_DEFAULTS.icon}
                    color={mod.color}
                    expandable
                    open={moduleOpen}
                    meta={`${plural(counts.subjectsIn[mod.id] || 0, 'subject')} · ${plural(counts.lessonsInModule[mod.id] || 0, 'lesson')}`}
                    badge={mod.status === 'active' ? undefined : 'Completed'}
                    onToggle={() => toggleModule(mod.id)}
                    onRename={name => renameEntity('module', mod.id, name)}
                    onDetails={() => setEditor({ kind: 'module', id: mod.id })}
                    onDelete={() => setDeleteTarget({ kind: 'module', id: mod.id })}
                    extraActions={
                      <button
                        type="button"
                        onClick={() => setEditor({ kind: 'stages', moduleId: mod.id })}
                        aria-label={`Exam stages for ${mod.name}`}
                        title="Exam stages"
                        style={{ ...miniBtn(pt.sub), padding: '6px 8px' }}
                      >
                        <TargetIcon color={pt.sub} size={12} />
                      </button>
                    }
                  />

                  {moduleOpen && (
                    <div className="st-children" style={{ ['--st-line' as string]: `${mod.color}55` } as React.CSSProperties}>
                      {modSubjects.map(subject => {
                        const subjectOpen = subject.id === subjectId
                        const subjectLessons = lessons.filter(l => l.subject_id === subject.id)
                        const subjectColor = subject.color || SUBJECT_DEFAULTS.color
                        return (
                          <div key={subject.id}>
                            <TreeRow
                              dark={dark}
                              noun="subject"
                              label={subject.name}
                              icon={subject.icon}
                              fallbackIcon={SUBJECT_DEFAULTS.icon}
                              color={subjectColor}
                              expandable
                              open={subjectOpen}
                              meta={plural(counts.lessonsInSubject[subject.id] || 0, 'lesson')}
                              onToggle={() => toggleSubject(subject)}
                              onRename={name => renameEntity('subject', subject.id, name)}
                              onDetails={() => setEditor({ kind: 'subject', id: subject.id, moduleId: subject.module_id })}
                              onDelete={() => setDeleteTarget({ kind: 'subject', id: subject.id })}
                            />

                            {subjectOpen && (
                              <div className="st-children" style={{ ['--st-line' as string]: `${subjectColor}55` } as React.CSSProperties}>
                                {subjectLessons.map(lesson => (
                                  <TreeRow
                                    key={lesson.id}
                                    dark={dark}
                                    noun="lesson"
                                    label={lesson.title}
                                    icon={lesson.icon}
                                    fallbackIcon={LESSON_FALLBACK_ICON}
                                    color={subjectColor}
                                    expandable={false}
                                    active={lesson.id === lessonId}
                                    chips={(stageMap[lesson.id] || []).map(value => {
                                      const option = stageOptions.find(o => o.value === value)
                                      return { label: option?.label ?? value, color: option?.color ?? '#64748b' }
                                    })}
                                    onToggle={() => selectLesson(lesson)}
                                    onRename={name => renameEntity('lesson', lesson.id, name)}
                                    onDetails={() => setEditor({ kind: 'lesson', id: lesson.id, subjectId: lesson.subject_id })}
                                    onDelete={() => setDeleteTarget({ kind: 'lesson', id: lesson.id })}
                                  />
                                ))}
                                <div style={{ padding: '6px 6px 2px' }}>
                                  <QuickAddRow
                                    dark={dark}
                                    indent={0}
                                    placeholder="Add lesson"
                                    onAdd={names => quickAddLessons(subject, names)}
                                    onDetails={() => setEditor({ kind: 'lesson', id: null, subjectId: subject.id })}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      <div style={{ padding: '6px 6px 2px' }}>
                        <QuickAddRow
                          dark={dark}
                          indent={0}
                          placeholder="Add subject"
                          onAdd={names => quickAddSubjects(mod, names)}
                          onDetails={() => setEditor({ kind: 'subject', id: null, moduleId: mod.id })}
                        />
                      </div>
                    </div>
                  )}
                </LiquidGlassCard>
              )
            })}

            <LiquidGlassCard dark={dark} delay={0} style={{ padding: '12px 14px' }}>
              <QuickAddRow
                dark={dark}
                indent={0}
                placeholder="Add module"
                onAdd={quickAddModules}
                onDetails={() => setEditor({ kind: 'module', id: null })}
              />
            </LiquidGlassCard>
          </div>
        </>
      )}

      {form && <EditorModal dark={dark} onClose={() => setEditor(NONE)}>{form}</EditorModal>}

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
