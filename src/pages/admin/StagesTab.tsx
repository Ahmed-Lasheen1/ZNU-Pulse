// src/pages/admin/StagesTab.tsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import ModuleSelect from './ModuleSelect'
import AdminSplitLayout from './AdminSplitLayout'
import EmptyState from '../../components/pulse/EmptyState'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import ConfirmDialog from '../../components/ConfirmDialog'
import { btnStyle, miniBtn, cancelBtnStyle, inStyle as adminInStyle, fieldLabel } from './adminStyles'
import { EXAM_STAGES as STAGE_META } from '../../lib/examStages'
import { invalidateModuleStagesCache } from '../../lib/moduleStages'
import { fetchLessonStageMap } from '../../lib/lessonStages'
import { fetchAllRows } from '../../lib/fetchAllRows'
import { simulatorPool } from '../../lib/stageSimulator'
import { useAdminMessage } from './useAdminMessage'
import { TargetIcon, GearIcon, DotIcon, TrashIcon, CheckCircleIcon } from '../../components/ui/tool-icons'
import type { AdminModule, AdminSubject } from './adminTypes'

interface StageRow {
  _key: string
  id: string | null
  value: string
  title: string
  emoji: string
  color: string
}

interface StagesTabProps {
  dark: boolean
  modules: AdminModule[]
  subjects: AdminSubject[]
}

const MAX_PER_SUBJECT = 100
const MAX_TOTAL = 200

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'stage'
}

function toCount(v: string | undefined) {
  const n = parseInt(v || '', 10)
  return Number.isFinite(n) ? Math.max(0, Math.min(MAX_PER_SUBJECT, n)) : 0
}

export default function StagesTab({ dark, modules, subjects }: StagesTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message: msg, showMessage: showMsg } = useAdminMessage()

  const [stageModuleId, setStageModuleId] = useState('')
  const [moduleStagesList, setModuleStagesList] = useState<StageRow[]>([])
  const [stagesIsCustom, setStagesIsCustom] = useState(false)
  const [stagesLoading, setStagesLoading] = useState(false)
  const [stagesSaving, setStagesSaving] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  const [simStage, setSimStage] = useState('')
  const [simCounts, setSimCounts] = useState<Record<string, string>>({})
  const [simQuestions, setSimQuestions] = useState<any[]>([])
  const [lessonStageMap, setLessonStageMap] = useState<Record<string, string[]>>({})
  const [simLoading, setSimLoading] = useState(false)
  const [simSaving, setSimSaving] = useState(false)

  useEffect(() => {
    if (stageModuleId) loadModuleStagesForAdmin(stageModuleId)
  }, [stageModuleId])

  useEffect(() => {
    setSimStage('')
    setSimCounts({})
    setSimQuestions([])
    if (!stageModuleId) return
    let ignore = false
    Promise.all([
      fetchAllRows(() => supabase
        .from('questions_public')
        .select('id, subject_id, lesson_id, exam_type, exam_stage')
        .eq('module_id', stageModuleId)
        .order('id')),
      fetchLessonStageMap(),
    ]).then(([qRes, mapRes]) => {
      if (ignore) return
      setSimQuestions(qRes.data || [])
      setLessonStageMap(mapRes.map)
    })
    return () => { ignore = true }
  }, [stageModuleId])

  useEffect(() => {
    setSimCounts({})
    if (!stageModuleId || !simStage) return
    let ignore = false
    setSimLoading(true)
    supabase.from('stage_simulator_config')
      .select('subject_id, question_count')
      .eq('module_id', stageModuleId).eq('stage', simStage)
      .then(({ data, error }) => {
        if (ignore) return
        if (error) showMsg('❌ Could not load simulator settings')
        const next: Record<string, string> = {}
        ;(data || []).forEach((r: any) => { next[r.subject_id] = String(r.question_count) })
        setSimCounts(next)
        setSimLoading(false)
      })
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageModuleId, simStage])

  async function loadModuleStagesForAdmin(moduleId: string) {
    setStagesLoading(true)
    const { data } = await supabase.from('module_exam_stages').select('*').eq('module_id', moduleId).order('position')
    if (data && data.length > 0) {
      setModuleStagesList(data.map((s: any) => ({ _key: s.id, id: s.id, value: s.value, title: s.title, emoji: s.emoji, color: s.color })))
      setStagesIsCustom(true)
    } else {
      setModuleStagesList(STAGE_META.map(s => ({ _key: crypto.randomUUID(), id: null, value: s.value, title: s.title, emoji: s.emoji, color: s.color })))
      setStagesIsCustom(false)
    }
    setStagesLoading(false)
  }

  function updateStageField(index: number, field: keyof StageRow, val: string) {
    setModuleStagesList(prev => prev.map((s, i) => i === index ? { ...s, [field]: val } : s))
  }
  function removeStageRow(index: number) {
    setModuleStagesList(prev => prev.filter((_, i) => i !== index))
  }
  function addStageRow() {
    const existingValues = moduleStagesList.map(s => s.value)
    let value = 'new_stage'
    let suffix = 1
    while (existingValues.includes(value)) { value = `new_stage_${suffix}`; suffix++ }
    setModuleStagesList(prev => [...prev, { _key: crypto.randomUUID(), id: null, value, title: 'New Stage', emoji: '', color: '#64748b' }])
  }

  // Replaced in one database transaction, so a failure can't leave the module with no stages.
  async function saveModuleStages() {
    if (!stageModuleId) return
    if (moduleStagesList.length === 0) return showMsg('❌ A module needs at least one exam stage')
    setStagesSaving(true)

    const rows = moduleStagesList.map((s, i) => ({
      value: s.value || slugify(s.title),
      title: s.title || 'Stage',
      emoji: s.emoji || '',
      color: s.color || '#64748b',
      position: i
    }))
    const { error } = await supabase.rpc('admin_replace_module_stages', { p_module_id: stageModuleId, p_rows: rows })

    setStagesSaving(false)
    if (error) return showMsg('❌ ' + error.message)

    invalidateModuleStagesCache()
    showMsg('✅ Stages saved for this module!')
    setStagesIsCustom(true)
    loadModuleStagesForAdmin(stageModuleId)
  }

  function requestResetModuleStages() {
    if (!stageModuleId) return
    setConfirmResetOpen(true)
  }

  async function resetModuleStages() {
    setConfirmResetOpen(false)
    setStagesSaving(true)
    const { error } = await supabase.from('module_exam_stages').delete().eq('module_id', stageModuleId)
    setStagesSaving(false)
    if (error) return showMsg('❌ ' + error.message)
    invalidateModuleStagesCache()
    showMsg('✅ Reset to default stages')
    loadModuleStagesForAdmin(stageModuleId)
  }

  const moduleSubjects = useMemo(() => subjects.filter(s => s.module_id === stageModuleId), [subjects, stageModuleId])

  const available = useMemo(() => {
    const out: Record<string, number> = {}
    if (!simStage) return out
    moduleSubjects.forEach(s => { out[s.id] = simulatorPool(simQuestions, s.id, simStage, lessonStageMap).length })
    return out
  }, [moduleSubjects, simQuestions, simStage, lessonStageMap])

  const simTotal = moduleSubjects.reduce((sum, s) => sum + toCount(simCounts[s.id]), 0)

  async function saveSimulator() {
    if (!stageModuleId || !simStage || simSaving) return
    if (simTotal > MAX_TOTAL) return showMsg(`❌ Total cannot exceed ${MAX_TOTAL} questions`)
    const rows = moduleSubjects
      .map(s => ({ subject_id: s.id, question_count: toCount(simCounts[s.id]) }))
      .filter(r => r.question_count > 0)
    setSimSaving(true)
    const { error } = await supabase.rpc('admin_replace_stage_simulator', {
      p_module_id: stageModuleId, p_stage: simStage, p_rows: rows
    })
    setSimSaving(false)
    showMsg(error ? '❌ ' + error.message : rows.length === 0 ? '✅ Simulator turned off for this stage' : '✅ Simulator saved for this stage!')
  }

  const form = (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
      <h3 style={{ color: pt.cobalt, marginBottom: 8, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
        <TargetIcon color={pt.cobalt} size={18} /> Exam Stages per Module
      </h3>
      <p style={{ color: pt.textMuted, fontSize: 13, marginBottom: 16 }}>
        Every module starts with the same 4 default stages (TBL, End Module, Practical, Final). Pick a module
        below to rename, add, or remove stages just for that module — everywhere else keeps the defaults
        until you save changes here.
      </p>
      <ModuleSelect modules={modules} value={stageModuleId} onChange={setStageModuleId} dark={dark} />
    </LiquidGlassCard>
  )

  const list = (
    <div>
      {!stageModuleId && (
        <EmptyState dark={dark} message={<><TargetIcon color={pt.sub} size={15} /> Pick a module on the left to edit its exam stages</>} />
      )}

      {stageModuleId && (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
          {stagesLoading && <p style={{ color: pt.sub, textAlign: 'center' }}>Loading...</p>}

          {!stagesLoading && (
            <>
              <div style={{
                fontSize: 12, fontWeight: 700, marginBottom: 16,
                color: stagesIsCustom ? pt.amber : pt.sub,
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                {stagesIsCustom
                  ? <><GearIcon color={pt.amber} size={13} /> Custom stages for this module</>
                  : <><DotIcon color={pt.sub} size={9} /> Showing global defaults (not yet customized)</>}
              </div>

              <div className="admin-stage-grid">
                {moduleStagesList.map((stage, i) => (
                  <div key={stage._key} style={{ marginBottom: 14 }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '50px 1fr 70px auto', gap: 8,
                      alignItems: 'center'
                    }}>
                      <input value={stage.emoji} onChange={e => updateStageField(i, 'emoji', e.target.value)}
                        placeholder="icon"
                        style={{ ...inStyle, marginBottom: 0, textAlign: 'center', padding: '8px 4px' }} />
                      <input value={stage.title} onChange={e => updateStageField(i, 'title', e.target.value)}
                        style={{ ...inStyle, marginBottom: 0 }} />
                      <input type="color" value={stage.color} onChange={e => updateStageField(i, 'color', e.target.value)}
                        style={{ ...inStyle, marginBottom: 0, padding: 4, height: 42 }} />
                      <button onClick={() => removeStageRow(i)} aria-label="Remove stage"
                        style={{ ...miniBtn(pt, pt.danger), display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon color={pt.danger} size={12} /></button>
                    </div>
                    <div style={{ color: pt.textMuted, fontSize: 11, marginTop: 4, marginLeft: 2 }}>{stage.value}</div>
                  </div>
                ))}
              </div>

              <button onClick={addStageRow} style={{
                background: 'transparent', border: `1px dashed ${pt.border}`, borderRadius: 10,
                padding: '10px', width: '100%', cursor: 'pointer', color: pt.sub,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 700, marginBottom: 16
              }}>+ Add Stage</button>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={saveModuleStages} disabled={stagesSaving} style={{ ...btnStyle(pt, dark), flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {stagesSaving ? 'Saving...' : <><CheckCircleIcon color="#fff" size={13} /> Save Stages</>}
                </button>
                {stagesIsCustom && (
                  <button onClick={requestResetModuleStages} disabled={stagesSaving} style={cancelBtnStyle(pt, dark)}>
                    Reset to Default
                  </button>
                )}
              </div>
            </>
          )}
        </LiquidGlassCard>
      )}

      {stageModuleId && !stagesLoading && (
        <div style={{ marginTop: 16 }}>
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
            <h3 style={{ color: pt.cobalt, marginBottom: 8, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TargetIcon color={pt.cobalt} size={18} /> Stage Simulator
            </h3>
            <p style={{ color: pt.textMuted, fontSize: 13, marginBottom: 16 }}>
              Pick a stage and set how many questions to draw from each subject. Every time a student starts the
              simulator, the questions are picked at random from those tagged to that stage. Leave a subject at 0 to
              skip it; save with everything at 0 to turn the simulator off for the stage.
            </p>

            <label style={fieldLabel(pt)}>Stage</label>
            <select value={simStage} onChange={e => setSimStage(e.target.value)} style={inStyle}>
              <option value="">Select a stage</option>
              {moduleStagesList.map(s => <option key={s._key} value={s.value}>{s.title}</option>)}
            </select>

            {simStage && moduleSubjects.length === 0 && (
              <p style={{ color: pt.textMuted, fontSize: 12 }}>This module has no subjects yet.</p>
            )}

            {simStage && simLoading && <p style={{ color: pt.sub, textAlign: 'center' }}>Loading...</p>}

            {simStage && !simLoading && moduleSubjects.length > 0 && (
              <>
                {moduleSubjects.map(sub => {
                  const avail = available[sub.id] ?? 0
                  const want = toCount(simCounts[sub.id])
                  const short = want > avail
                  return (
                    <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: pt.text, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</div>
                        <div style={{ color: short ? pt.amber : pt.textMuted, fontSize: 11, marginTop: 2 }}>
                          {avail} available{short ? ` — only ${avail} will be used` : ''}
                        </div>
                      </div>
                      <input
                        type="number" inputMode="numeric" min={0} max={MAX_PER_SUBJECT}
                        value={simCounts[sub.id] ?? ''} placeholder="0"
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

                <button onClick={saveSimulator} disabled={simSaving} style={{ ...btnStyle(pt, dark), width: '100%', opacity: simSaving ? 0.7 : 1, cursor: simSaving ? 'not-allowed' : 'pointer' }}>
                  {simSaving ? 'Saving...' : 'Save Simulator'}
                </button>
              </>
            )}
          </LiquidGlassCard>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <InlineMessage message={msg} />
      <style>{`
        @media (min-width: 1300px) {
          .admin-stage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; }
        }
      `}</style>
      <AdminSplitLayout formWidth={340} form={form} list={list} />
      <ConfirmDialog
        dark={dark}
        open={confirmResetOpen}
        title="Reset to default stages?"
        message="Custom stages you added will be removed — anything already tagged with a removed stage keeps that tag, it just won't have a matching button anymore."
        confirmLabel="Reset"
        confirmColor={pt.danger}
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={resetModuleStages}
      />
    </div>
  )
}
