import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import IconPicker from '../../components/admin/IconPicker'
import AdminFormCard from './AdminFormCard'
import { inStyle as adminInStyle, fieldLabel } from './adminStyles'
import { useAdminEntityCrud } from './useAdminEntityCrud'
import { useStageOptions, type StageOption } from './useStageOptions'
import { REQUIRED_FIELDS_MESSAGE } from './useAdminContext'
import { fetchLessonStageMap, invalidateLessonStagesCache } from '../../lib/lessonStages'
import { CheckCircleIcon } from '../../components/ui/tool-icons'
import type { AdminModule, AdminSubject, AdminLesson } from './adminTypes'

const FALLBACK_STAGE_COLOR = '#64748b'

interface LessonFormProps {
  dark: boolean
  lesson: AdminLesson | null
  module: AdminModule
  subject: AdminSubject
  showMessage: (message: string) => void
  onSaved: () => void
  onDone: () => void
}

export default function LessonForm({ dark, lesson, module, subject, showMessage, onSaved, onDone }: LessonFormProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const stageOptions = useStageOptions(module.id)
  const editing = !!lesson
  const lessonId = lesson?.id

  const [title, setTitle] = useState(lesson?.title ?? '')
  const [icon, setIcon] = useState(lesson?.icon || '')
  const [stages, setStages] = useState<string[]>([])

  useEffect(() => {
    if (!lessonId) return
    let ignore = false
    fetchLessonStageMap().then(({ map }) => {
      if (!ignore) setStages(map[lessonId] || [])
    })
    return () => { ignore = true }
  }, [lessonId])

  function resetForm() {
    setTitle('')
    setIcon('')
    setStages([])
    onDone()
  }

  function toggleStage(value: string) {
    setStages(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  async function syncLessonStages(id: string) {
    const { data: existing, error: readError } = await supabase.from('lesson_exam_stages').select('stage').eq('lesson_id', id)
    if (readError) return { error: readError }

    const have = new Set<string>((existing || []).map((r: any) => r.stage))
    const want = new Set(stages)
    const toRemove = [...have].filter(s => !want.has(s))
    const toAdd = [...want].filter(s => !have.has(s))

    if (toRemove.length > 0) {
      const { error } = await supabase.from('lesson_exam_stages').delete().eq('lesson_id', id).in('stage', toRemove)
      if (error) return { error }
    }
    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('lesson_exam_stages')
        .upsert(toAdd.map(stage => ({ lesson_id: id, stage })), { onConflict: 'lesson_id,stage', ignoreDuplicates: true })
      if (error) return { error }
    }
    return { error: null }
  }

  const crud = useAdminEntityCrud({
    table: 'lessons',
    label: 'Lesson',
    editingId: lesson?.id ?? null,
    buildPayload: () => ({ title, subject_id: subject.id, module_id: module.id, icon: icon || null }),
    resetForm,
    refresh: () => {
      invalidateLessonStagesCache()
      onSaved()
    },
    showMessage,
    insertFn: async payload => {
      const { data, error } = await supabase.from('lessons').insert([payload]).select('id').single()
      if (error || !data) return { error: error || new Error('Could not create the lesson') }
      const stageResult = await syncLessonStages(data.id)
      if (stageResult.error) await supabase.from('lessons').delete().eq('id', data.id)
      return stageResult
    },
    updateFn: async (id, payload) => {
      const { error } = await supabase.from('lessons').update(payload).eq('id', id)
      if (error) return { error }
      return syncLessonStages(id)
    },
  })

  function save() {
    if (crud.saving) return
    if (!title) return showMessage(REQUIRED_FIELDS_MESSAGE)
    crud.save()
  }

  const options: StageOption[] = [
    ...stageOptions,
    ...stages
      .filter(v => !stageOptions.some(o => o.value === v))
      .map(v => ({ value: v, label: v, color: FALLBACK_STAGE_COLOR })),
  ]

  return (
    <AdminFormCard
      dark={dark}
      noun="Lesson"
      description={`In ${module.name} › ${subject.name}`}
      editing={editing}
      addLabel="Add Lesson"
      saving={crud.saving}
      onSave={save}
      onCancel={editing ? resetForm : undefined}
    >
      <input placeholder="Lesson title" value={title} onChange={e => setTitle(e.target.value)} style={inStyle} />
      <IconPicker value={icon} onChange={setIcon} inStyle={inStyle} pt={pt} />

      {options.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <label style={fieldLabel(pt)}>Exam stages (optional)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {options.map(stage => {
              const on = stages.includes(stage.value)
              return (
                <button
                  key={stage.value}
                  type="button"
                  onClick={() => toggleStage(stage.value)}
                  aria-pressed={on}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999,
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${on ? stage.color : pt.border}`,
                    background: on ? `${stage.color}22` : 'transparent',
                    color: on ? stage.color : pt.sub
                  }}
                >
                  {on && <CheckCircleIcon color={stage.color} size={13} />}
                  {stage.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </AdminFormCard>
  )
}
