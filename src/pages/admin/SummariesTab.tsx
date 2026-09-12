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
import { useAdminMessage } from './useAdminMessage'
import { EditIcon, PlusIcon, TrashIcon, ConstructionIcon, LinkIcon, UploadIcon } from '../../components/ui/tool-icons'
import { publishSummary } from '../../lib/publishSummary'
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

// Two ways to get a summary's `url`: paste one directly, or upload an
// HTML file (+ optional images) and let the backend publish it and
// fill the URL in automatically. Upload is only available when adding
// a NEW summary — editing always edits url/fields directly.
type PublishMode = 'link' | 'upload'

export default function SummariesTab({ dark, modules, subjects, lessons }: SummariesTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message: msg, showMessage: showMsg } = useAdminMessage(4000)

  const [summaries, setSummaries] = useState<SummaryRow[]>([])
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
  const [saving, setSaving] = useState(false)

  // Publish-by-upload state — kept separate from the link-mode fields
  // so switching modes never clobbers what's already typed.
  const [publishMode, setPublishMode] = useState<PublishMode>('link')
  const [htmlFile, setHtmlFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [publishing, setPublishing] = useState(false)

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
    setPublishMode('link')
    setSumTitle(s.title); setSumUrl(s.url); setSumModuleId(s.module_id)
    setSumSubjectId(s.subject_id || ''); setSumLessonId(s.lesson_id || '')
    setSumExamStage(s.exam_stage || '')
  }
  function resetSummaryForm() {
    setEditingSummaryId(null); setSumTitle(''); setSumUrl('')
    setSumSubjectId(''); setSumLessonId(''); setSumExamStage('')
    setHtmlFile(null); setImageFiles([])
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

  async function publishSummaryFromFile() {
    if (!sumTitle || !sumModuleId || !htmlFile || publishing) {
      return showMsg('❌ Title, module, and an HTML file are required')
    }
    setPublishing(true)
    try {
      const mod = modules.find(m => m.id === sumModuleId)
      const sub = subjects.find(s => s.id === sumSubjectId)
      const result = await publishSummary({
        title: sumTitle,
        htmlFile,
        imageFiles,
        moduleId: sumModuleId,
        moduleName: mod?.name || sumModuleId,
        subjectId: sumSubjectId || null,
        subjectName: sub?.name || null,
        lessonId: sumLessonId || null,
        examStage: sumExamStage || null,
      })
      showMsg('✅ Summary published! URL: ' + result.url)
      resetSummaryForm()
      fetchSummaries()
    } catch (e: any) {
      showMsg('❌ ' + (e?.message || 'Could not publish summary'))
    }
    setPublishing(false)
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

  const isBusy = saving || publishing
  const totalUploadBytes = (htmlFile?.size || 0) + imageFiles.reduce((a, f) => a + f.size, 0)
  const totalUploadMb = (totalUploadBytes / (1024 * 1024)).toFixed(1)
  const overSizeLimit = totalUploadBytes > 4 * 1024 * 1024 // soft warning only

  const form = (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
      <h3 style={{ color: pt.cobalt, marginBottom: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
        {editingSummaryId ? <><EditIcon color={pt.cobalt} size={16} /> Edit Summary</> : <><PlusIcon color={pt.cobalt} size={16} /> Add Summary</>}
      </h3>

      {!editingSummaryId && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setPublishMode('link')}
            style={{
              flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer',
              border: `1.5px solid ${publishMode === 'link' ? pt.cobalt : pt.border}`,
              background: publishMode === 'link' ? `${pt.cobalt}18` : 'transparent',
              color: publishMode === 'link' ? pt.cobalt : pt.sub, fontWeight: 700, fontSize: 12,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          ><LinkIcon color={publishMode === 'link' ? pt.cobalt : pt.sub} size={13} /> Paste a Link</button>
          <button
            onClick={() => setPublishMode('upload')}
            style={{
              flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer',
              border: `1.5px solid ${publishMode === 'upload' ? pt.cobalt : pt.border}`,
              background: publishMode === 'upload' ? `${pt.cobalt}18` : 'transparent',
              color: publishMode === 'upload' ? pt.cobalt : pt.sub, fontWeight: 700, fontSize: 12,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          ><UploadIcon color={publishMode === 'upload' ? pt.cobalt : pt.sub} size={13} /> Upload HTML</button>
        </div>
      )}

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

      {(editingSummaryId || publishMode === 'link') ? (
        <>
          <input placeholder="Summary URL" value={sumUrl} onChange={e => setSumUrl(e.target.value)} style={inStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveSummary} disabled={isBusy} style={{ ...btnStyle(pt, dark), flex: 1, opacity: isBusy ? 0.7 : 1, cursor: isBusy ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : editingSummaryId ? 'Save Changes' : 'Add Summary'}
            </button>
            {editingSummaryId && <button onClick={resetSummaryForm} disabled={isBusy} style={cancelBtnStyle(pt, dark)}>Cancel</button>}
          </div>
        </>
      ) : (
        <>
          <label style={fieldLabel(pt)}>HTML File</label>
          <input
            type="file" accept=".html,.htm"
            onChange={e => setHtmlFile(e.target.files?.[0] || null)}
            style={{ ...inStyle, padding: '10px 12px' }}
          />
          <label style={fieldLabel(pt)}>Images (optional — referenced by the HTML with relative paths)</label>
          <input
            type="file" accept="image/*" multiple
            onChange={e => setImageFiles(Array.from(e.target.files || []))}
            style={{ ...inStyle, padding: '10px 12px' }}
          />
          {imageFiles.length > 0 && (
            <div style={{ color: pt.textMuted, fontSize: 11, marginTop: -8, marginBottom: 12 }}>
              {imageFiles.length} image{imageFiles.length === 1 ? '' : 's'} selected
            </div>
          )}
          {(htmlFile || imageFiles.length > 0) && (
            <div style={{ color: overSizeLimit ? pt.danger : pt.textMuted, fontSize: 11, marginBottom: 12 }}>
              Total: {totalUploadMb} MB{overSizeLimit ? ' — likely too large; compress images and keep the total under ~4 MB' : ''}
            </div>
          )}
          <button onClick={publishSummaryFromFile} disabled={isBusy} style={{ ...btnStyle(pt, dark), width: '100%', opacity: isBusy ? 0.7 : 1, cursor: isBusy ? 'not-allowed' : 'pointer' }}>
            {publishing ? 'Publishing...' : 'Publish Summary'}
          </button>
        </>
      )}
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
