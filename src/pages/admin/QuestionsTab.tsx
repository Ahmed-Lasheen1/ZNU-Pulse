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
import { EditIcon, PlusIcon, TrashIcon, ConstructionIcon, ListIcon, SearchIcon2, RobotIcon, BookIcon, GraduationCapIcon } from '../../components/ui/tool-icons'
import QuestionSourceBadge from '../../components/QuestionSourceBadge'
import type { AdminModule, AdminSubject, AdminLesson } from './adminTypes'

const EXAM_STAGES = STAGE_META.map(s => ({ value: s.value, label: s.title }))

interface QuestionRow {
  id: string
  question: string
  module_id: string
  subject_id?: string | null
  lesson_id?: string | null
  exam_type: string
  exam_stage?: string | null
  source?: string | null
  created_at: string
}

interface QuestionsTabProps {
  dark: boolean
  modules: AdminModule[]
  subjects: AdminSubject[]
  lessons: AdminLesson[]
}

export default function QuestionsTab({ dark, modules, subjects, lessons }: QuestionsTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message: msg, showMessage: showMsg } = useAdminMessage()

  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [qText, setQText] = useState('')
  const [qA, setQA] = useState('')
  const [qB, setQB] = useState('')
  const [qC, setQC] = useState('')
  const [qD, setQD] = useState('')
  const [qCorrect, setQCorrect] = useState('a')
  const [qExplanation, setQExplanation] = useState('')
  const [qModuleId, setQModuleId] = useState('')
  const [qSubjectId, setQSubjectId] = useState('')
  const [qLessonId, setQLessonId] = useState('')
  const [qExamType, setQExamType] = useState('both')
  const [qExamStage, setQExamStage] = useState('')
  const [qStageOptions, setQStageOptions] = useState(EXAM_STAGES)
  const [qSource, setQSource] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [moduleFilter, setModuleFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchQuestions() }, [])
  useEffect(() => {
    fetchModuleStages(qModuleId).then(list => setQStageOptions(list.map(s => ({ value: s.value, label: s.title }))))
  }, [qModuleId])

  async function fetchQuestions() {
    setQuestionsLoading(true)
    const { data } = await supabase
      .from('questions')
      .select('id, question, module_id, subject_id, lesson_id, exam_type, exam_stage, source, created_at')
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT)
    if (data) setQuestions(data as QuestionRow[])
    setQuestionsLoading(false)
  }

  async function editQuestion(q: QuestionRow) {
    const { data, error } = await supabase.rpc('admin_get_question', { p_question_id: q.id })
    if (error || !data || data.length === 0) return showMsg('❌ Could not load this question for editing')
    const full = data[0]
    setEditingQuestionId(full.id)
    setQText(full.question); setQA(full.option_a); setQB(full.option_b); setQC(full.option_c); setQD(full.option_d)
    setQCorrect(full.correct || 'a'); setQExplanation(full.explanation || '')
    setQExamType(full.exam_type); setQExamStage(full.exam_stage || '')
    setQModuleId(full.module_id); setQSubjectId(full.subject_id || '')
    setQLessonId(full.lesson_id || ''); setQSource(full.source || '')
    setBulkMode(false)
  }
  function resetQuestionForm() {
    setEditingQuestionId(null)
    setQText(''); setQA(''); setQB(''); setQC(''); setQD(''); setQCorrect('a'); setQExplanation('')
    setQSubjectId(''); setQLessonId(''); setQExamStage('')
  }
  async function saveQuestion() {
    if (!qText || !qA || !qB || !qC || !qD || !qModuleId || saving) return
    setSaving(true)
    if (editingQuestionId) {
      const { error } = await supabase.rpc('admin_update_question', {
        p_id: editingQuestionId,
        p_question: qText, p_option_a: qA, p_option_b: qB, p_option_c: qC, p_option_d: qD,
        p_correct: qCorrect, p_explanation: qExplanation, p_exam_type: qExamType, p_exam_stage: qExamStage || null,
        p_module_id: qModuleId, p_subject_id: qSubjectId || null, p_lesson_id: qLessonId || null, p_source: qSource || null
      })
      setSaving(false)
      if (!error) { showMsg('✅ Question updated!'); resetQuestionForm(); fetchQuestions() }
      else showMsg('❌ ' + error.message)
    } else {
      const { error } = await supabase.from('questions').insert([{
        question: qText, option_a: qA, option_b: qB, option_c: qC, option_d: qD,
        correct: qCorrect, explanation: qExplanation, exam_type: qExamType,
        exam_stage: qExamStage || null, module_id: qModuleId, subject_id: qSubjectId || null,
        lesson_id: qLessonId || null, source: qSource || null
      }])
      setSaving(false)
      if (!error) { showMsg('✅ Question added!'); resetQuestionForm(); fetchQuestions() }
      else showMsg('❌ ' + error.message)
    }
  }

  function parseBulkQuestions(text: string) {
    const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
    const parsed: any[] = []
    const errors: string[] = []

    blocks.forEach((block, idx) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
      const qLine = lines.find(l => /^Q[:\-]/i.test(l))
      const aLine = lines.find(l => /^A[)\.\-]/i.test(l))
      const bLine = lines.find(l => /^B[)\.\-]/i.test(l))
      const cLine = lines.find(l => /^C[)\.\-]/i.test(l))
      const dLine = lines.find(l => /^D[)\.\-]/i.test(l))
      const correctLine = lines.find(l => /^Correct[:\-]/i.test(l))
      const explLine = lines.find(l => /^Explanation[:\-]/i.test(l))

      if (!qLine || !aLine || !bLine || !cLine || !dLine || !correctLine) {
        errors.push(`Question ${idx + 1}: missing Q/A/B/C/D/Correct line`)
        return
      }
      const correctLetter = correctLine.replace(/^Correct[:\-]/i, '').trim().toLowerCase().charAt(0)
      if (!['a', 'b', 'c', 'd'].includes(correctLetter)) {
        errors.push(`Question ${idx + 1}: "Correct" must be A, B, C or D`)
        return
      }
      parsed.push({
        question: qLine.replace(/^Q[:\-]/i, '').trim(),
        option_a: aLine.replace(/^A[)\.\-]/i, '').trim(),
        option_b: bLine.replace(/^B[)\.\-]/i, '').trim(),
        option_c: cLine.replace(/^C[)\.\-]/i, '').trim(),
        option_d: dLine.replace(/^D[)\.\-]/i, '').trim(),
        correct: correctLetter,
        explanation: explLine ? explLine.replace(/^Explanation[:\-]/i, '').trim() : '',
      })
    })

    return { questions: parsed, errors }
  }

  async function bulkAddQuestions() {
    if (!qModuleId) return showMsg('❌ Please select a module first')
    if (!bulkText.trim()) return showMsg('❌ Paste some questions first')

    const { questions: parsed, errors } = parseBulkQuestions(bulkText)
    if (errors.length > 0) {
      showMsg(`❌ ${errors.length} question(s) have a formatting problem — ${errors[0]}`)
      return
    }
    if (parsed.length === 0) return showMsg('❌ No questions found in the text')

    setBulkSaving(true)
    const rows = parsed.map(q => ({
      ...q,
      exam_type: qExamType,
      exam_stage: qExamStage || null,
      module_id: qModuleId,
      subject_id: qSubjectId || null,
      lesson_id: qLessonId || null,
      source: qSource || null
    }))
    const { error } = await supabase.from('questions').insert(rows)
    setBulkSaving(false)

    if (error) { showMsg('❌ ' + error.message); return }
    showMsg(`✅ ${rows.length} questions added!`)
    setBulkText('')
    fetchQuestions()
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question? This cannot be undone.')) return
    if (editingQuestionId === id) resetQuestionForm()
    const { error } = await supabase.from('questions').delete().eq('id', id)
    showMsg(error ? '❌ ' + error.message : '✅ Question deleted')
    fetchQuestions()
  }

  const filteredSubjects = (moduleId: string) => subjects.filter(s => s.module_id === moduleId)
  const filteredLessons = (subjectId: string) => lessons.filter(l => l.subject_id === subjectId)

  const visibleModules = moduleFilter === 'all' ? modules : modules.filter(m => m.id === moduleFilter)
  const searchLower = search.trim().toLowerCase()

  const form = (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ color: pt.cobalt, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          {editingQuestionId
            ? <><EditIcon color={pt.cobalt} size={16} /> Edit Question</>
            : bulkMode ? <><ListIcon color={pt.cobalt} size={16} /> Bulk Add Questions</> : <><PlusIcon color={pt.cobalt} size={16} /> Add MCQ Question</>}
        </h3>
        {!editingQuestionId && (
          <button onClick={() => setBulkMode(!bulkMode)} style={{
            background: 'transparent', border: `1px solid ${pt.border}`,
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            color: pt.sub, fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 5
          }}>{bulkMode ? <><EditIcon color={pt.sub} size={12} /> Single Add</> : <><ListIcon color={pt.sub} size={12} /> Bulk Add</>}</button>
        )}
      </div>

      <label style={fieldLabel(pt)}>Module</label>
      <ModuleSelect modules={modules} value={qModuleId} onChange={id => { setQModuleId(id); setQSubjectId(''); setQLessonId('') }} dark={dark} />

      <label style={fieldLabel(pt)}>Subject (optional)</label>
      <select value={qSubjectId} onChange={e => { setQSubjectId(e.target.value); setQLessonId('') }} style={inStyle} disabled={!qModuleId}>
        <option value="">All Subjects</option>
        {filteredSubjects(qModuleId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {qSubjectId && filteredLessons(qSubjectId).length > 0 && (
        <>
          <label style={fieldLabel(pt)}>Lesson (optional)</label>
          <select value={qLessonId} onChange={e => setQLessonId(e.target.value)} style={inStyle}>
            <option value="">No specific lesson</option>
            {filteredLessons(qSubjectId).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </>
      )}
      <div className="admin-form-row-2">
        <div>
          <label style={fieldLabel(pt)}>Use In</label>
          <select value={qExamType} onChange={e => setQExamType(e.target.value)} style={inStyle}>
            <option value="both">Practice + Mock Exam</option>
            <option value="practice">Practice Only</option>
            <option value="mock">Mock Exam Only</option>
          </select>
        </div>
        <div>
          <label style={fieldLabel(pt)}>Exam Stage (optional)</label>
          <select value={qExamStage} onChange={e => setQExamStage(e.target.value)} style={inStyle}>
            <option value="">No specific stage</option>
            {qStageOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <label style={fieldLabel(pt)}>Source (optional)</label>
      <select value={qSource} onChange={e => setQSource(e.target.value)} style={inStyle}>
        <option value="">No tag</option>
        <option value="ai">AI</option>
        <option value="courses">Courses</option>
        <option value="university">University Doctors</option>
      </select>
      {qSource && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 12, color: pt.textMuted, fontSize: 11 }}>
          {qSource === 'ai' && <RobotIcon color={pt.textMuted} size={12} />}
          {qSource === 'courses' && <BookIcon color={pt.textMuted} size={12} />}
          {qSource === 'university' && <GraduationCapIcon color={pt.textMuted} size={12} />}
          Tag preview
        </div>
      )}

      {bulkMode && !editingQuestionId ? (
        <>
          <p style={{ color: pt.textMuted, fontSize: 12, marginBottom: 8, lineHeight: 1.6 }}>
            Paste as many questions as you want below, one after another,
            separated by an empty line. Every question in this box will
            be added to the module/subject/type selected above. Format:
          </p>
          <pre style={{
            background: pt.surfaceFlat, border: `1px solid ${pt.border}`, borderRadius: 10,
            padding: 12, fontSize: 11, color: pt.sub, marginBottom: 12,
            whiteSpace: 'pre-wrap', lineHeight: 1.6, overflowX: 'auto'
          }}>{`Q: What is the powerhouse of the cell?
A) Nucleus
B) Mitochondria
C) Ribosome
D) Golgi apparatus
Correct: B
Explanation: Mitochondria produce ATP.

Q: Second question here...
A) ...
B) ...
C) ...
D) ...
Correct: A`}</pre>
          <textarea
            placeholder="Paste your questions here..."
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            style={{ ...inStyle, minHeight: 240, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
          <button onClick={bulkAddQuestions} disabled={bulkSaving} style={{ ...btnStyle(pt, dark), width: '100%', opacity: bulkSaving ? 0.7 : 1, cursor: bulkSaving ? 'not-allowed' : 'pointer' }}>
            {bulkSaving ? 'Adding...' : 'Parse & Add All'}
          </button>
        </>
      ) : (
        <>
          <textarea placeholder="Question" value={qText} onChange={e => setQText(e.target.value)} style={{ ...inStyle, minHeight: 80, resize: 'vertical' }} />
          {['A', 'B', 'C', 'D'].map((opt, i) => (
            <input key={opt} placeholder={`Option ${opt}`}
              value={[qA, qB, qC, qD][i]}
              onChange={e => [setQA, setQB, setQC, setQD][i](e.target.value)}
              style={inStyle} />
          ))}
          <label style={fieldLabel(pt)}>Correct Answer</label>
          <select value={qCorrect} onChange={e => setQCorrect(e.target.value)} style={inStyle}>
            <option value="a">A</option>
            <option value="b">B</option>
            <option value="c">C</option>
            <option value="d">D</option>
          </select>
          <textarea placeholder="Explanation (optional)" value={qExplanation} onChange={e => setQExplanation(e.target.value)} style={{ ...inStyle, minHeight: 60, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveQuestion} disabled={saving} style={{ ...btnStyle(pt, dark), flex: 1, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : editingQuestionId ? 'Save Changes' : 'Add Question'}
            </button>
            {editingQuestionId && <button onClick={resetQuestionForm} disabled={saving} style={cancelBtnStyle(pt, dark)}>Cancel</button>}
          </div>
        </>
      )}
    </LiquidGlassCard>
  )

  const list = (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <input
            placeholder="Search questions..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inStyle, marginBottom: 0, paddingLeft: 34 }}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <SearchIcon2 color={pt.faint} size={14} />
          </span>
        </div>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} style={{ ...inStyle, width: 'auto', marginBottom: 0 }}>
          <option value="all">All modules ({questions.length})</option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {questionsLoading && (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: pt.sub }}>Loading...</p>
        </LiquidGlassCard>
      )}

      {!questionsLoading && questions.length === 0 && (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><ConstructionIcon color={pt.sub} size={14} /> No questions yet — add one on the left</p>
        </LiquidGlassCard>
      )}

      {!questionsLoading && visibleModules.map(mod => {
        const modQuestions = questions.filter(q =>
          q.module_id === mod.id &&
          (!searchLower || q.question.toLowerCase().includes(searchLower))
        )
        if (modQuestions.length === 0) return null
        return (
          <div key={mod.id} style={{ marginBottom: 20 }}>
            <h4 style={groupHeading(mod.color)}>
              <ModuleIcon value={mod.icon} size={18} color={mod.color} /> {mod.name}
              <span style={{ color: pt.textMuted, fontSize: 12, fontWeight: 400 }}>({modQuestions.length})</span>
            </h4>
            <div className="admin-list-grid">
              {modQuestions.map(q => {
                const isEditing = editingQuestionId === q.id
                const stageText = q.exam_stage
                  ? (EXAM_STAGES.find(s => s.value === q.exam_stage)?.label || q.exam_stage)
                  : null
                return (
                  <LiquidGlassCard
                    key={q.id} dark={dark} delay={0}
                    style={{
                      padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10,
                      boxShadow: isEditing ? `inset 0 0 0 2px ${pt.cobalt}` : undefined
                    }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <p style={{
                        color: pt.text, fontWeight: 600, fontSize: 13, lineHeight: 1.45, margin: 0,
                        flex: 1, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere',
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                      }}>{q.question}</p>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => editQuestion(q)} aria-label={`Edit question: ${q.question}`} style={{ ...miniBtn(pt, pt.cobalt), display: 'inline-flex', alignItems: 'center' }}><EditIcon color={pt.cobalt} size={12} /></button>
                        <button onClick={() => deleteQuestion(q.id)} aria-label={`Delete question: ${q.question}`} style={{ ...miniBtn(pt, pt.danger), display: 'inline-flex', alignItems: 'center' }}><TrashIcon color={pt.danger} size={12} /></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                        background: `${pt.cobalt}18`, border: `1px solid ${pt.cobalt}40`, color: pt.cobalt
                      }}>
                        {q.exam_type === 'practice' ? 'Practice Only' : q.exam_type === 'mock' ? 'Mock Only' : 'Practice + Mock'}
                      </span>
                      {stageText && (
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                          background: `${pt.indigo}18`, border: `1px solid ${pt.indigo}40`, color: pt.indigo
                        }}>{stageText}</span>
                      )}
                      {q.source && <QuestionSourceBadge source={q.source} />}
                    </div>
                  </LiquidGlassCard>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div>
      <InlineMessage message={msg} />
      <AdminSplitLayout formWidth={420} form={form} list={list} />
    </div>
  )
}
