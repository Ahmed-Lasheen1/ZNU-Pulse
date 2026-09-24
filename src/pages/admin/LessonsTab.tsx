// src/pages/admin/LessonsTab.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import ModuleSelect from './ModuleSelect'
import AdminSplitLayout from './AdminSplitLayout'
import EmptyState from '../../components/pulse/EmptyState'
import AdminModuleFilterSelect from './AdminModuleFilterSelect'
import IconPicker from '../../components/admin/IconPicker'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import ConfirmDialog from '../../components/ConfirmDialog'
import { ModuleIcon } from '../../lib/medicalIcons'
import { fetchModuleStages } from '../../lib/moduleStages'
import { invalidateLessonStagesCache } from '../../lib/lessonStages'
import { miniBtn, cancelBtnStyle, submitBtnStyle, inStyle as adminInStyle, fieldLabel, groupHeading, LIST_LIMIT } from './adminStyles'
import { useAdminMessage } from './useAdminMessage'
import { useAdminEntityCrud } from './useAdminEntityCrud'
import { useConfirmDelete } from './useConfirmDelete'
import { EditIcon, PlusIcon, TrashIcon, ConstructionIcon, CheckCircleIcon } from '../../components/ui/tool-icons'
import type { AdminModule, AdminSubject, AdminLesson } from './adminTypes'

interface LessonsTabProps {
  dark: boolean
  modules: AdminModule[]
  subjects: AdminSubject[]
  lessons: AdminLesson[]
  fetchLessons: () => void
  refDataLoading: boolean
}

interface StageOption { value: string; title: string; color: string }

export default function LessonsTab({ dark, modules, subjects, lessons, fetchLessons, refDataLoading }: LessonsTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message: msg, showMessage: showMsg } = useAdminMessage()

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [lessonModuleId, setLessonModuleId] = useState('')
  const [lessonSubjectId, setLessonSubjectId] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonIcon, setLessonIcon] = useState('')
  const [lessonStages, setLessonStages] = useState<string[]>([])
  const [savedStages, setSavedStages] = useState<Record<string, string[]>>({})
  const [moduleStagesMap, setModuleStagesMap] = useState<Record<string, StageOption[]>>({})
  const [moduleFilter, setModuleFilter] = useState('all')

  useEffect(() => { fetchSavedStages() }, [])

  useEffect(() => {
    let ignore = false
    Promise.all(modules.map(m => fetchModuleStages(m.id).then(list => [m.id, list] as const)))
      .then(entries => { if (!ignore) setModuleStagesMap(Object.fromEntries(entries) as Record<string, StageOption[]>) })
    return () => { ignore = true }
  }, [modules])

  async function fetchSavedStages() {
    const { data, error } = await supabase.from('lesson_exam_stages').select('lesson_id, stage')
    if (error) { showMsg('❌ Could not load lesson exam stages'); return }
    const map: Record<string, string[]> = {}
    ;(data || []).forEach((r: any) => { (map[r.lesson_id] ||= []).push(r.stage) })
    setSavedStages(map)
  }

  function refreshAll() {
    invalidateLessonStagesCache()
    fetchLessons()
    fetchSavedStages()
  }

  function editLesson(l: AdminLesson) {
    setEditingLessonId(l.id)
    setLessonModuleId(l.module_id); setLessonSubjectId(l.subject_id)
    setLessonTitle(l.title); setLessonIcon(l.icon || '')
    setLessonStages(savedStages[l.id] || [])
  }
  function resetLessonForm() {
    setEditingLessonId(null); setLessonTitle(''); setLessonIcon(''); setLessonStages([])
  }

  function toggleStage(value: string) {
    setLessonStages(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  // Makes the lesson's saved stages match the picked ones: removes
  // the unpicked, adds only the missing (the primary key on
  // lesson_id + stage means a pair can never be stored twice).
  async function syncLessonStages(lessonId: string) {
    const { data: existing, error: readError } = await supabase
      .from('lesson_exam_stages').select('stage').eq('lesson_id', lessonId)
    if (readError) return { error: readError }

    const have = new Set((existing || []).map((r: any) => r.stage as string))
    const want = new Set(lessonStages)
    const toRemove = [...have].filter(s => !want.has(s))
    const toAdd = [...want].filter(s => !have.has(s))

    if (toRemove.length > 0) {
      const { error } = await supabase.from('lesson_exam_stages').delete().eq('lesson_id', lessonId).in('stage', toRemove)
      if (error) return { error }
    }
    if (toAdd.length > 0) {
      const { error } = await supabase.from('lesson_exam_stages')
        .upsert(toAdd.map(stage => ({ lesson_id: lessonId, stage })), { onConflict: 'lesson_id,stage', ignoreDuplicates: true })
      if (error) return { error }
    }
    return { error: null }
  }

  const crud = useAdminEntityCrud({
    table: 'lessons', label: 'Lesson', editingId: editingLessonId,
    buildPayload: () => ({ title: lessonTitle, subject_id: lessonSubjectId, module_id: lessonModuleId, icon: lessonIcon || null }),
    resetForm: resetLessonForm, refresh: refreshAll, showMessage: showMsg,
    insertFn: async (payload) => {
      const { data, error } = await supabase.from('lessons').insert([payload]).select('id').single()
      if (error || !data) return { error: error || new Error('Could not create the lesson') }
      const stageResult = await syncLessonStages(data.id)
      if (stageResult.error) {
        // Roll back so a retry can't leave a second copy of the lesson behind.
        await supabase.from('lessons').delete().eq('id', data.id)
      }
      return stageResult
    },
    updateFn: async (id, payload) => {
      const { error } = await supabase.from('lessons').update(payload).eq('id', id)
      if (error) return { error }
      return syncLessonStages(id)
    }
  })
  const del = useConfirmDelete(crud.remove)

  function saveLesson() {
    if (!lessonTitle || !lessonSubjectId || !lessonModuleId || crud.saving) return showMsg('❌ Pick a module, subject, and title first')
    crud.save()
  }

  const filteredSubjects = (moduleId: string) => subjects.filter(s => s.module_id === moduleId)
  const visibleModules = moduleFilter === 'all' ? modules : modules.filter(m => m.id === moduleFilter)
  const moduleStageOptions = moduleStagesMap[lessonModuleId] || []
  // A stage saved earlier that the module no longer defines stays visible so it can still be unpicked.
  const stageOptions: StageOption[] = [
    ...moduleStageOptions,
    ...lessonStages.filter(v => !moduleStageOptions.some(o => o.value === v)).map(v => ({ value: v, title: v, color: '#64748b' })),
  ]
  const stageTitle = (moduleId: string, value: string) =>
    (moduleStagesMap[moduleId] || []).find(s => s.value === value)?.title || value

  const form = (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
      <h3 style={{ color: pt.cobalt, marginBottom: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
        {editingLessonId ? <><EditIcon color={pt.cobalt} size={16} /> Edit Lesson</> : <><PlusIcon color={pt.cobalt} size={16} /> Add Lesson</>}
      </h3>
      <p style={{ color: pt.textMuted, fontSize: 13, marginBottom: 16 }}>
        A lesson lives under a subject. Tag questions to it from the Questions tab; add a summary from Summaries.
      </p>
      <label style={fieldLabel(pt)}>Module</label>
      <ModuleSelect modules={modules} value={lessonModuleId} onChange={id => { setLessonModuleId(id); setLessonSubjectId(''); setLessonStages([]) }} dark={dark} />
      {lessonModuleId && (
        <select value={lessonSubjectId} onChange={e => setLessonSubjectId(e.target.value)} style={inStyle}>
          <option value="">Select Subject</option>
          {filteredSubjects(lessonModuleId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      <input placeholder="Lesson title" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} style={inStyle} />
      <IconPicker value={lessonIcon} onChange={setLessonIcon} inStyle={inStyle} pt={pt} />

      {lessonModuleId && stageOptions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <label style={fieldLabel(pt)}>Exam stages (optional)</label>
          <p style={{ color: pt.textMuted, fontSize: 12, marginBottom: 8 }}>
            Everything tagged to this lesson also appears under each stage you pick.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stageOptions.map(stage => {
              const on = lessonStages.includes(stage.value)
              return (
                <button
                  key={stage.value} type="button" onClick={() => toggleStage(stage.value)} aria-pressed={on}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999,
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${on ? stage.color : pt.border}`,
                    background: on ? `${stage.color}22` : 'transparent',
                    color: on ? stage.color : pt.sub
                  }}
                >
                  {on && <CheckCircleIcon color={stage.color} size={13} />}
                  {stage.title}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={saveLesson} disabled={crud.saving} style={submitBtnStyle(pt, dark, crud.saving)}>
          {crud.saving ? 'Saving...' : editingLessonId ? 'Save Changes' : 'Add Lesson'}
        </button>
        {editingLessonId && <button onClick={resetLessonForm} disabled={crud.saving} style={cancelBtnStyle(pt, dark)}>Cancel</button>}
      </div>
    </LiquidGlassCard>
  )

  const list = (
    <div>
      <AdminModuleFilterSelect modules={modules} value={moduleFilter} onChange={setModuleFilter} totalCount={lessons.length} inStyle={inStyle} />

      {lessons.length === LIST_LIMIT && (
        <p style={{ color: pt.textMuted, fontSize: 11, marginBottom: 12 }}>Showing the most recent {LIST_LIMIT} — older lessons aren't listed here.</p>
      )}

      {refDataLoading && <EmptyState dark={dark} message="Loading..." />}

      {!refDataLoading && lessons.length === 0 && (
        <EmptyState dark={dark} message={<><ConstructionIcon color={pt.sub} size={14} /> No lessons yet — add one on the left</>} />
      )}

      {!refDataLoading && visibleModules.map(mod => {
        const modSubjects = filteredSubjects(mod.id)
        const modLessons = lessons.filter(l => l.module_id === mod.id)
        if (modLessons.length === 0) return null
        return (
          <div key={mod.id} style={{ marginBottom: 20 }}>
            <h4 style={groupHeading(mod.color)}>
              <ModuleIcon value={mod.icon} size={18} color={mod.color} /> {mod.name}
            </h4>
            {modSubjects.map(sub => {
              const subLessons = modLessons.filter(l => l.subject_id === sub.id)
              if (subLessons.length === 0) return null
              return (
                <div key={sub.id} style={{ marginBottom: 10 }}>
                  <div style={{ color: pt.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ModuleIcon value={sub.icon || '📖'} size={13} color={pt.textMuted} /> {sub.name}
                  </div>
                  <div className="admin-list-grid">
                    {subLessons.map(l => (
                      <LiquidGlassCard key={l.id} dark={dark} delay={0} style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, minWidth: 0 }}>
                          <ModuleIcon value={l.icon || '📘'} size={18} color="#34d399" />
                          <span style={{ color: pt.text, fontWeight: 600 }}>{l.title}</span>
                          {(savedStages[l.id] || []).map(value => (
                            <span key={value} style={{
                              fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                              background: `${pt.indigo}18`, border: `1px solid ${pt.indigo}40`, color: pt.indigo
                            }}>{stageTitle(l.module_id, value)}</span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => editLesson(l)} aria-label={`Edit lesson: ${l.title}`} style={{ ...miniBtn(pt, pt.cobalt), display: 'inline-flex', alignItems: 'center' }}><EditIcon color={pt.cobalt} size={12} /></button>
                          <button onClick={() => del.requestDelete(l.id)} aria-label={`Delete lesson: ${l.title}`} style={{ ...miniBtn(pt, pt.danger), display: 'inline-flex', alignItems: 'center' }}><TrashIcon color={pt.danger} size={12} /></button>
                        </div>
                      </LiquidGlassCard>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  return (
    <div>
      <InlineMessage message={msg} />
      <AdminSplitLayout form={form} list={list} />
      <ConfirmDialog
        dark={dark}
        open={del.open}
        title="Delete lesson?"
        message="Questions tagged to it keep their module/subject tags but lose the lesson link. This cannot be undone."
        confirmLabel="Delete"
        confirmColor={pt.danger}
        onCancel={del.cancel}
        onConfirm={del.confirm}
      />
    </div>
  )
}
