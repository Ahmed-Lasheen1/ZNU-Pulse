import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import AdminFormCard from './AdminFormCard'
import ConfirmDialog from '../../components/ConfirmDialog'
import { miniBtn, inStyle as adminInStyle, fieldLabel } from './adminStyles'
import { EXAM_STAGES as DEFAULT_STAGES } from '../../lib/examStages'
import { invalidateModuleStagesCache } from '../../lib/moduleStages'
import { fetchLessonStageMap } from '../../lib/lessonStages'
import { fetchAllRows } from '../../lib/fetchAllRows'
import { simulatorPool } from '../../lib/stageSimulator'
import { TargetIcon, GearIcon, DotIcon, TrashIcon, PlusIcon } from '../../components/ui/tool-icons'
import type { AdminModule, AdminSubject } from './adminTypes'

interface StageRow {
  key: string
  value: string
  title: string
  emoji: string
  color: string
}

interface StagesPanelProps {
  dark: boolean
  module: AdminModule
  subjects: AdminSubject[]
  showMessage: (message: string) => void
}

const MAX_PER_SUBJECT = 100
const MAX_TOTAL = 200
const FALLBACK_STAGE_COLOR = '#64748b'

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'stage'
}

function toCount(value: string | undefined) {
  const n = parseInt(value || '', 10)
  return Number.isFinite(n) ? Math.max(0, Math.min(MAX_PER_SUBJECT, n)) : 0
}

function defaultStageRows(): StageRow[] {
  return DEFAULT_STAGES.map(s => ({ key: crypto.randomUUID(), value: s.value, title: s.title, emoji: s.emoji, color: s.color }))
}

export default function StagesPanel({ dark, module, subjects, showMessage }: StagesPanelProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)

  const [stages, setStages] = useState<StageRow[]>([])
  const [isCustom, setIsCustom] = useState(false)
  const [stagesLoading, setStagesLoading] = useState(true)
  const [stagesSaving, setStagesSaving] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  const [simStage, setSimStage] = useState('')
  const [simCounts, setSimCounts] = useState<Record<string, string>>({})
  const [simQuestions, setSimQuestions] = useState<any[]>([])
  const [lessonStageMap, setLessonStageMap] = useState<Record<string, string[]>>({})
  const [simLoading, setSimLoading] = useState(false)
  const [simSaving, setSimSaving] = useState(false)

  const loadStages = useCallback(async () => {
    setStagesLoading(true)
    const { data } = await supabase.from('module_exam_stages').select('*').eq('module_id', module.id).order('position')
    if (data && data.length > 0) {
      setStages(data.map((s: any) => ({ key: s.id, value: s.value, title: s.title, emoji: s.emoji, color: s.color })))
      setIsCustom(true)
    } else {
      setStages(defaultStageRows())
      setIsCustom(false)
    }
    setStagesLoading(false)
  }, [module.id])

  useEffect(() => { loadStages() }, [loadStages])

  useEffect(() => {
    let ignore = false
    Promise.all([
      fetchAllRows(() => supabase
        .from('questions_public')
        .select('id, subject_id, lesson_id, exam_type, exam_stage')
        .eq('module_id', module.id)
        .order('id')),
      fetchLessonStageMap(),
    ]).then(([questionsRes, mapRes]) => {
      if (ignore) return
      setSimQuestions(questionsRes.data || [])
      setLessonStageMap(mapRes.map)
    })
    return () => { ignore = true }
  }, [module.id])

  useEffect(() => {
    setSimCounts({})
    if (!simStage) return
    let ignore = false
    setSimLoading(true)
    supabase
      .from('stage_simulator_config')
      .select('subject_id, question_count')
      .eq('module_id', module.id)
      .eq('stage', simStage)
      .then(({ data, error }) => {
        if (ignore) return
        if (error) showMessage('❌ Could not load simulator settings')
        const next: Record<string, string> = {}
        ;(data || []).forEach((r: any) => { next[r.subject_id] = String(r.question_count) })
        setSimCounts(next)
        setSimLoading(false)
      })
    return () => { ignore = true }
  }, [module.id, simStage, showMessage])

  function updateStage(key: string, field: 'title' | 'emoji' | 'color', value: string) {
    setStages(prev => prev.map(s => s.key === key ? { ...s, [field]: value } : s))
  }

  function removeStage(key: string) {
    setStages(prev => prev.filter(s => s.key !== key))
  }

  function addStage() {
    const taken = new Set(stages.map(s => s.value))
    let value = 'new_stage'
    for (let suffix = 1; taken.has(value); suffix++) value = `new_stage_${suffix}`
    setStages(prev => [...prev, { key: crypto.randomUUID(), value, title: 'New Stage', emoji: '', color: FALLBACK_STAGE_COLOR }])
  }

  async function saveStages() {
    if (stages.length === 0) return showMessage('❌ A module needs at least one exam stage')
    setStagesSaving(true)
    const rows = stages.map((s, i) => ({
      value: s.value || slugify(s.title),
      title: s.title || 'Stage',
      emoji: s.emoji || '',
      color: s.color || FALLBACK_STAGE_COLOR,
      position: i,
    }))
    const { error } = await supabase.rpc('admin_replace_module_stages', { p_module_id: module.id, p_rows: rows })
    setStagesSaving(false)
    if (error) return showMessage('❌ ' + error.message)
    invalidateModuleStagesCache()
    showMessage('✅ Stages saved for this module!')
    loadStages()
  }

  async function resetStages() {
    setConfirmResetOpen(false)
    setStagesSaving(true)
    const { error } = await supabase.from('module_exam_stages').delete().eq('module_id', module.id)
    setStagesSaving(false)
    if (error) return showMessage('❌ ' + error.message)
    invalidateModuleStagesCache()
    showMessage('✅ Reset to default stages')
    loadStages()
  }

  const available = useMemo(() => {
    const result: Record<string, number> = {}
    if (!simStage) return result
    subjects.forEach(s => { result[s.id] = simulatorPool(simQuestions, s.id, simStage, lessonStageMap).length })
    return result
  }, [subjects, simQuestions, simStage, lessonStageMap])

  const simTotal = subjects.reduce((sum, s) => sum + toCount(simCounts[s.id]), 0)

  async function saveSimulator() {
    if (!simStage || simSaving) return
    if (simTotal > MAX_TOTAL) return showMessage(`❌ Total cannot exceed ${MAX_TOTAL} questions`)
    const rows = subjects
      .map(s => ({ subject_id: s.id, question_count: toCount(simCounts[s.id]) }))
      .filter(r => r.question_count > 0)
    setSimSaving(true)
    const { error } = await supabase.rpc('admin_replace_stage_simulator', { p_module_id: module.id, p_stage: simStage, p_rows: rows })
    setSimSaving(false)
    showMessage(error ? '❌ ' + error.message : rows.length === 0 ? '✅ Simulator turned off for this stage' : '✅ Simulator saved for this stage!')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <AdminFormCard
        dark={dark}
        title="Exam Stages"
        Icon={TargetIcon}
        description={`${module.name} starts with the 4 default stages (TBL, End Module, Practical, Final). Rename, add or remove stages just for this module.`}
        addLabel="Save Stages"
        saving={stagesSaving}
        disabled={stagesLoading}
        onSave={saveStages}
        cancelLabel="Reset to Default"
        onCancel={isCustom ? () => setConfirmResetOpen(true) : undefined}
      >
        {stagesLoading ? (
          <p style={{ color: pt.sub, textAlign: 'center' }}>Loading...</p>
        ) : (
          <>
            <div style={{
              fontSize: 12, fontWeight: 700, marginBottom: 16,
              color: isCustom ? pt.amber : pt.sub,
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              {isCustom
                ? <><GearIcon color={pt.amber} size={13} /> Custom stages for this module</>
                : <><DotIcon color={pt.sub} size={9} /> Showing global defaults (not yet customized)</>}
            </div>

            {stages.map(stage => (
              <div key={stage.key} style={{ marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 70px auto', gap: 8, alignItems: 'center' }}>
                  <input
                    value={stage.emoji}
                    onChange={e => updateStage(stage.key, 'emoji', e.target.value)}
                    placeholder="icon"
                    style={{ ...inStyle, marginBottom: 0, textAlign: 'center', padding: '8px 4px' }}
                  />
                  <input value={stage.title} onChange={e => updateStage(stage.key, 'title', e.target.value)} style={{ ...inStyle, marginBottom: 0 }} />
                  <input
                    type="color"
                    value={stage.color}
                    onChange={e => updateStage(stage.key, 'color', e.target.value)}
                    style={{ ...inStyle, marginBottom: 0, padding: 4, height: 42 }}
                  />
                  <button onClick={() => removeStage(stage.key)} aria-label="Remove stage" style={miniBtn(pt.danger)}>
                    <TrashIcon color={pt.danger} size={12} />
                  </button>
                </div>
                <div style={{ color: pt.textMuted, fontSize: 11, marginTop: 4, marginLeft: 2 }}>{stage.value}</div>
              </div>
            ))}

            <button onClick={addStage} style={{ ...miniBtn(pt.sub), width: '100%', justifyContent: 'center', borderStyle: 'dashed', marginBottom: 16 }}>
              <PlusIcon color={pt.sub} size={11} /> Add Stage
            </button>
          </>
        )}
      </AdminFormCard>

      <AdminFormCard
        dark={dark}
        title="Stage Simulator"
        Icon={TargetIcon}
        description="Pick a stage and set how many questions to draw from each subject. Each run picks them at random from the questions tagged to that stage. Save with everything at 0 to turn the simulator off for the stage."
        addLabel="Save Simulator"
        saving={simSaving}
        disabled={!simStage || simLoading}
        onSave={saveSimulator}
      >
        <label style={fieldLabel(pt)}>Stage</label>
        <select value={simStage} onChange={e => setSimStage(e.target.value)} style={inStyle}>
          <option value="">Select a stage</option>
          {stages.map(s => <option key={s.key} value={s.value}>{s.title}</option>)}
        </select>

        {simStage && subjects.length === 0 && (
          <p style={{ color: pt.textMuted, fontSize: 12, marginBottom: 12 }}>This module has no subjects yet.</p>
        )}

        {simStage && simLoading && <p style={{ color: pt.sub, textAlign: 'center', marginBottom: 12 }}>Loading...</p>}

        {simStage && !simLoading && subjects.length > 0 && (
          <>
            {subjects.map(sub => {
              const pool = available[sub.id] ?? 0
              const short = toCount(simCounts[sub.id]) > pool
              return (
                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: pt.text, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</div>
                    <div style={{ color: short ? pt.amber : pt.textMuted, fontSize: 11, marginTop: 2 }}>
                      {pool} available{short ? ` — only ${pool} will be used` : ''}
                    </div>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_PER_SUBJECT}
                    value={simCounts[sub.id] ?? ''}
                    placeholder="0"
                    onChange={e => setSimCounts(prev => ({ ...prev, [sub.id]: e.target.value }))}
                    aria-label={`Questions from ${sub.name}`}
                    style={{ ...inStyle, marginBottom: 0, marginTop: 0, width: 80, textAlign: 'center', flexShrink: 0 }}
                  />
                </div>
              )
            })}
            <div style={{ color: simTotal > MAX_TOTAL ? pt.danger : pt.textMuted, fontSize: 12, fontWeight: 700, margin: '4px 0 14px' }}>
              Total requested: {simTotal}
            </div>
          </>
        )}
      </AdminFormCard>

      <ConfirmDialog
        dark={dark}
        open={confirmResetOpen}
        title="Reset to default stages?"
        message="Custom stages you added will be removed — anything already tagged with a removed stage keeps that tag, it just won't have a matching button anymore."
        confirmLabel="Reset"
        confirmColor={pt.danger}
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={resetStages}
      />
    </div>
  )
}
