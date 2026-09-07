import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import ModuleSelect from './ModuleSelect'
import AdminSplitLayout from './AdminSplitLayout'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import { ModuleIcon } from '../../lib/medicalIcons'
import { btnStyle, miniBtn, cancelBtnStyle, inStyle as adminInStyle, fieldLabel, groupHeading, LIST_LIMIT } from './adminStyles'
import { EXAM_STAGES as STAGE_META } from '../../lib/examStages'
import { fetchModuleStages } from '../../lib/moduleStages'
import { EditIcon, PlusIcon, TrashIcon, ConstructionIcon } from '../../components/ui/tool-icons'
import type { AdminModule, AdminSubject, AdminLesson } from './adminTypes'

const EXAM_STAGES = STAGE_META.map(s => ({ value: s.value, label: s.title }))

interface SummaryRow {
  id: string
  title: string
  url: string
  module_id: string
  subject_id?: string | null
  lesson_id?: string | null
  exam_stage?: string | null
}

interface SummariesTabProps {
  dark: boolean
  modules: AdminModule[]
  subjects: AdminSubject[]
  lessons: AdminLesson[]
}

export default function SummariesTab({ dark, modules, subjects, lessons }: SummariesTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const [msg, setMsg] = useState('')
  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const [summaries, setSummaries] = useState<SummaryRow[]>([])
  // AUDIT FIX (performance audit): own loading flag, same reasoning
  // as QuestionsTab/SchedulesTab.
  const [summariesLoading, setSummariesLoading] = useState(true)
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null)
  const [sumTitle, setSumTitle] = useState('')
  const [sumUrl, setSumUrl] = useState('')
  const [sumModuleId, setSumModuleId] = useState('')
  const [sumSubjectId, setSumSubjectId] = useState('')
  const [sumLessonId, setSumLessonId] = useState('')
  const [sumExamStage, setSumExamStage] = useState('')
  const [sumStageOptions, setSumStageOptions] = useState(EXAM_STAGES)
  const [moduleFilter, setModuleFilter] = useState('all')
  // AUDIT FIX (performance audit — double-submit risk).
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSummaries() }, [])
  useEffect(() => {
    fetchModuleStages(sumModuleId).then(list => setSumStageOptions(list.map(s => ({ value: s.value, label: s.title }))))
  }, [sumModuleId])

  async function fetchSummaries() {
    setSummariesLoading(true)
    const { data } = await supabase.from('summaries').select('*').order('created_at', { ascending: false }).limit(LIST_LIMIT)
    if (data) setSummaries(data as SummaryRow[])
    setSummariesLoading(false)
  }

  function editSummary(s: SummaryRow) {
    setEditingSummaryId(s.id)
    setSumTitle(s.title); setSumUrl(s.url); setSumModuleId(s.module_id)
    setSumSubjectId(s.subject_id || ''); setSumLessonId(s.lesson_id || '')
    setSumExamStage(s.exam_stage || '')
  }
  function resetSummaryForm() {
    setEditingSummaryId(null); setSumTitle(''); setSumUrl('')
    setSumSubjectId(''); setSumLessonId(''); setSumExamStage('')
  }
  async function saveSummary() {
    if (!sumTitle || !sumUrl || !sumModuleId || saving) return
    const payload = {
      title: sumTitle, url: sumUrl, module_id: sumModuleId,
      subject_id: sumSubjectId || null,
      lesson_id: sumLessonId || null,
      exam_stage: sumExamStage || null
    }
    setSaving(true)
    if (editingSummaryId) {
      const { error } = await supabase.from('summaries').update(payload).eq('id', editingSummaryId)
      setSaving(false)
      if (!error) { showMsg('✅ Summary updated!'); resetSummaryForm(); fetchSummaries() }
      else showMsg('❌ ' + error.message)
    } else {
      const { error } = await supabase.from('summaries').insert([payload])
      setSaving(false)
      if (!error) { showMsg('✅ Summary added!'); resetSummaryForm(); fetchSummaries() }
      else showMsg('❌ ' + error.message)
    }
  }
  async function deleteSummary(id: string) {
    if (!confirm('Delete this summary? This cannot be undone.')) return
    if (editingSummaryId === id) resetSummaryForm()
    const { error } = await supabase.from('summaries').delete().eq('id', id)
    showMsg(error ? '❌ ' + error.message : '✅ Summary deleted')
    fetchSummaries()
  }

  const filteredSubjects = (moduleId: string) => subjects.filter(s => s.module_id === moduleId)
  const filteredLessons = (subjectId: string) => lessons.filter(l => l.subject_id === subjectId)
  const visibleModules = moduleFilter === 'all' ? modules : modules.filter(m => m.id === moduleFilter)

  const form = (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
      <h3 style={{ color: pt.cobalt, marginBottom: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
        {editingSummaryId ? <><EditIcon color={pt.cobalt} size={16} /> Edit Summary</> : <><PlusIcon color={pt.cobalt} size={16} /> Add Summary</>}
      </h3>
      <label style={fieldLabel(pt)}>Module</label>
      <ModuleSelect modules={modules} value={sumModuleId} onChange={id => { setSumModuleId(id); setSumSubjectId(''); setSumLessonId('') }} dark={dark} />

      <label style={fieldLabel(pt)}>Subject (optional)</label>
      <select value={sumSubjectId} onChange={e => { setSumSubjectId(e.target.value); setSumLessonId('') }} style={inStyle} disabled={!sumModuleId}>
        <option value="">All Subjects</option>
        {filteredSubjects(sumModuleId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {sumSubjectId && filteredLessons(sumSubjectId).length > 0 && (
        <>
          <label style={fieldLabel(pt)}>Lesson (optional)</label>
          <select value={sumLessonId} onChange={e => setSumLessonId(e.target.value)} style={inStyle}>
            <option value="">No specific lesson</option>
            {filteredLessons(sumSubjectId).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </>
      )}

      <label style={fieldLabel(pt)}>Exam Stage (optional)</label>
      <select value={sumExamStage} onChange={e => setSumExamStage(e.target.value)} style={inStyle}>
        <option value="">No specific stage</option>
        {sumStageOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <input placeholder="Title (e.g. End Module Exam)" value={sumTitle} onChange={e => setSumTitle(e.target.value)} style={inStyle} />
      <input placeholder="Summary URL" value={sumUrl} onChange={e => setSumUrl(e.target.value)} style={inStyle} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={saveSummary} disabled={saving} style={{ ...btnStyle(pt, dark), flex: 1, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : editingSummaryId ? 'Save Changes' : 'Add Summary'}
        </button>
        {editingSummaryId && <button onClick={resetSummaryForm} disabled={saving} style={cancelBtnStyle(pt, dark)}>Cancel</button>}
      </div>
    </LiquidGlassCard>
  )

  const list = (
    <div>
      <div style={{ marginBottom: 16 }}>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} style={{ ...inStyle, width: 'auto', marginBottom: 0 }}>
          <option value="all">All modules ({summaries.length})</option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {summariesLoading && (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: pt.sub }}>Loading...</p>
        </LiquidGlassCard>
      )}

      {!summariesLoading && summaries.length === 0 && (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><ConstructionIcon color={pt.sub} size={14} /> No summaries yet — add one on the left</p>
        </LiquidGlassCard>
      )}

      {!summariesLoading && visibleModules.map(mod => {
        const modSummaries = summaries.filter(s => s.module_id === mod.id)
        if (modSummaries.length === 0) return null
        return (
          <div key={mod.id} style={{ marginBottom: 20 }}>
            <h4 style={groupHeading(mod.color)}>
              <ModuleIcon value={mod.icon} size={18} color={mod.color} /> {mod.name}
              <span style={{ color: pt.textMuted, fontSize: 12, fontWeight: 400 }}>({modSummaries.length})</span>
            </h4>
            <div className="admin-list-grid">
              {modSummaries.map(s => (
                <LiquidGlassCard key={s.id} dark={dark} delay={0} style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ color: pt.text, fontWeight: 600 }}>{s.title}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => editSummary(s)} aria-label={`Edit summary: ${s.title}`} style={{ ...miniBtn(pt, pt.cobalt), display: 'inline-flex', alignItems: 'center' }}><EditIcon color={pt.cobalt} size={12} /></button>
                    <button onClick={() => deleteSummary(s.id)} aria-label={`Delete summary: ${s.title}`} style={{ ...miniBtn(pt, pt.danger), display: 'inline-flex', alignItems: 'center' }}><TrashIcon color={pt.danger} size={12} /></button>
                  </div>
                </LiquidGlassCard>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div>
      <InlineMessage message={msg} />
      <AdminSplitLayout form={form} list={list} />
    </div>
  )
}
