import { useState } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import QuestionSourceBadge from '../../components/QuestionSourceBadge'
import AdminSplitLayout from './AdminSplitLayout'
import AdminFormCard from './AdminFormCard'
import AdminDetails from './AdminDetails'
import AdminRow from './AdminRow'
import AdminGroupedList from './AdminGroupedList'
import AdminDeleteDialog from './AdminDeleteDialog'
import { inStyle as adminInStyle, fieldLabel, miniBtn, LIST_LIMIT } from './adminStyles'
import { useAdminMessage } from './useAdminMessage'
import { useAdminEntityCrud } from './useAdminEntityCrud'
import { useConfirmDelete } from './useConfirmDelete'
import { useAdminList } from './useAdminList'
import { useStageOptions } from './useStageOptions'
import { PICK_MODULE_MESSAGE, REQUIRED_FIELDS_MESSAGE } from './useAdminContext'
import { EditIcon, ListIcon, ConstructionIcon, SearchIcon2 } from '../../components/ui/tool-icons'
import type { AdminModule, AdminContext } from './adminTypes'

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

interface QuestionDraft {
  question: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correct: string
  explanation: string
  examType: string
  examStage: string
  source: string
}

interface QuestionPayload {
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct: string
  explanation: string
  exam_type: string
  exam_stage: string | null
  module_id: string
  subject_id: string | null
  lesson_id: string | null
  source: string | null
}

type ParsedQuestion = Pick<QuestionPayload, 'question' | 'option_a' | 'option_b' | 'option_c' | 'option_d' | 'correct' | 'explanation'>

interface QuestionsTabProps {
  dark: boolean
  modules: AdminModule[]
  context: AdminContext
}

const QUESTION_COLUMNS = 'id, question, module_id, subject_id, lesson_id, exam_type, exam_stage, source, created_at'

const EMPTY_DRAFT: QuestionDraft = {
  question: '', optionA: '', optionB: '', optionC: '', optionD: '',
  correct: 'a', explanation: '', examType: 'both', examStage: '', source: '',
}

const OPTION_FIELDS = [
  { key: 'optionA', label: 'A' },
  { key: 'optionB', label: 'B' },
  { key: 'optionC', label: 'C' },
  { key: 'optionD', label: 'D' },
] as const

const EXAM_TYPES = [
  { value: 'both', label: 'Practice + Mock Exam' },
  { value: 'practice', label: 'Practice Only' },
  { value: 'mock', label: 'Mock Exam Only' },
]

const SOURCES = [
  { value: '', label: 'No tag' },
  { value: 'ai', label: 'AI' },
  { value: 'courses', label: 'Courses' },
  { value: 'university', label: 'University Doctors' },
]

const BULK_FORMAT_EXAMPLE = `Q: What is the powerhouse of the cell?
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
Correct: A`

function parseBulkQuestions(text: string) {
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  const questions: ParsedQuestion[] = []
  const errors: string[] = []

  blocks.forEach((block, index) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    const qLine = lines.find(l => /^Q[:\-]/i.test(l))
    const aLine = lines.find(l => /^A[)\.\-]/i.test(l))
    const bLine = lines.find(l => /^B[)\.\-]/i.test(l))
    const cLine = lines.find(l => /^C[)\.\-]/i.test(l))
    const dLine = lines.find(l => /^D[)\.\-]/i.test(l))
    const correctLine = lines.find(l => /^Correct[:\-]/i.test(l))
    const explanationLine = lines.find(l => /^Explanation[:\-]/i.test(l))

    if (!qLine || !aLine || !bLine || !cLine || !dLine || !correctLine) {
      errors.push(`Question ${index + 1}: missing Q/A/B/C/D/Correct line`)
      return
    }
    const correct = correctLine.replace(/^Correct[:\-]/i, '').trim().toLowerCase().charAt(0)
    if (!['a', 'b', 'c', 'd'].includes(correct)) {
      errors.push(`Question ${index + 1}: "Correct" must be A, B, C or D`)
      return
    }
    questions.push({
      question: qLine.replace(/^Q[:\-]/i, '').trim(),
      option_a: aLine.replace(/^A[)\.\-]/i, '').trim(),
      option_b: bLine.replace(/^B[)\.\-]/i, '').trim(),
      option_c: cLine.replace(/^C[)\.\-]/i, '').trim(),
      option_d: dLine.replace(/^D[)\.\-]/i, '').trim(),
      correct,
      explanation: explanationLine ? explanationLine.replace(/^Explanation[:\-]/i, '').trim() : '',
    })
  })

  return { questions, errors }
}

export default function QuestionsTab({ dark, modules, context }: QuestionsTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message, showMessage } = useAdminMessage()
  const stageOptions = useStageOptions(context.moduleId)

  const [search, setSearch] = useState('')
  const { rows: questions, loading, error, refresh } = useAdminList<QuestionRow>({
    table: 'questions',
    moduleId: context.moduleId,
    select: QUESTION_COLUMNS,
    search: { column: 'question', term: search },
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<QuestionDraft>(EMPTY_DRAFT)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  const bulkActive = bulkMode && !editingId

  function setField<K extends keyof QuestionDraft>(key: K, value: QuestionDraft[K]) {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  async function editQuestion(row: QuestionRow) {
    const { data, error: loadError } = await supabase.rpc('admin_get_question', { p_question_id: row.id })
    if (loadError || !data || data.length === 0) return showMessage('❌ Could not load this question for editing')
    const full = data[0]
    setEditingId(full.id)
    setDraft({
      question: full.question,
      optionA: full.option_a,
      optionB: full.option_b,
      optionC: full.option_c,
      optionD: full.option_d,
      correct: full.correct || 'a',
      explanation: full.explanation || '',
      examType: full.exam_type,
      examStage: full.exam_stage || '',
      source: full.source || '',
    })
    context.setContext({ moduleId: full.module_id, subjectId: full.subject_id || '', lessonId: full.lesson_id || '' })
    setBulkMode(false)
  }

  function resetForm() {
    setEditingId(null)
    setDraft(prev => ({ ...EMPTY_DRAFT, examType: prev.examType, examStage: prev.examStage, source: prev.source }))
  }

  function scopeFields() {
    return {
      exam_type: draft.examType,
      exam_stage: draft.examStage || null,
      module_id: context.moduleId,
      subject_id: context.subjectId || null,
      lesson_id: context.lessonId || null,
      source: draft.source || null,
    }
  }

  const crud = useAdminEntityCrud<QuestionPayload>({
    table: 'questions',
    label: 'Question',
    editingId,
    buildPayload: () => ({
      question: draft.question,
      option_a: draft.optionA,
      option_b: draft.optionB,
      option_c: draft.optionC,
      option_d: draft.optionD,
      correct: draft.correct,
      explanation: draft.explanation,
      ...scopeFields(),
    }),
    resetForm,
    refresh,
    showMessage,
    updateFn: (id, p) => supabase.rpc('admin_update_question', {
      p_id: id,
      p_question: p.question,
      p_option_a: p.option_a,
      p_option_b: p.option_b,
      p_option_c: p.option_c,
      p_option_d: p.option_d,
      p_correct: p.correct,
      p_explanation: p.explanation,
      p_exam_type: p.exam_type,
      p_exam_stage: p.exam_stage,
      p_module_id: p.module_id,
      p_subject_id: p.subject_id,
      p_lesson_id: p.lesson_id,
      p_source: p.source,
    }),
  })
  const del = useConfirmDelete(crud.remove)

  function saveQuestion() {
    if (crud.saving) return
    if (!context.moduleId) return showMessage(PICK_MODULE_MESSAGE)
    if (!draft.question || !draft.optionA || !draft.optionB || !draft.optionC || !draft.optionD) {
      return showMessage(REQUIRED_FIELDS_MESSAGE)
    }
    crud.save()
  }

  async function bulkAddQuestions() {
    if (bulkSaving) return
    if (!context.moduleId) return showMessage(PICK_MODULE_MESSAGE)
    if (!bulkText.trim()) return showMessage('❌ Paste some questions first')

    const { questions: parsed, errors } = parseBulkQuestions(bulkText)
    if (errors.length > 0) return showMessage(`❌ ${errors.length} question(s) have a formatting problem — ${errors[0]}`)
    if (parsed.length === 0) return showMessage('❌ No questions found in the text')

    setBulkSaving(true)
    const { error: insertError } = await supabase.from('questions').insert(parsed.map(q => ({ ...q, ...scopeFields() })))
    setBulkSaving(false)

    if (insertError) return showMessage('❌ ' + insertError.message)
    showMessage(`✅ ${parsed.length} questions added!`)
    setBulkText('')
    refresh()
  }

  const stageLabel = (value: string) => stageOptions.find(s => s.value === value)?.label ?? value
  const detailsSummary = [
    draft.examType !== 'both' && EXAM_TYPES.find(t => t.value === draft.examType)?.label,
    draft.examStage && stageLabel(draft.examStage),
    draft.source && SOURCES.find(s => s.value === draft.source)?.label,
  ].filter(Boolean).join(' · ')

  const form = (
    <AdminFormCard
      dark={dark}
      noun="Question"
      title={bulkActive ? 'Bulk Add Questions' : undefined}
      Icon={bulkActive ? ListIcon : undefined}
      editing={!!editingId}
      addLabel={bulkActive ? 'Parse & Add All' : 'Add Question'}
      savingLabel={bulkActive ? 'Adding...' : 'Saving...'}
      saving={bulkActive ? bulkSaving : crud.saving}
      onSave={bulkActive ? bulkAddQuestions : saveQuestion}
      onCancel={editingId ? resetForm : undefined}
      headerAction={!editingId && (
        <button onClick={() => setBulkMode(m => !m)} style={miniBtn(pt.sub)}>
          {bulkMode ? <><EditIcon color={pt.sub} size={12} /> Single Add</> : <><ListIcon color={pt.sub} size={12} /> Bulk Add</>}
        </button>
      )}
    >
      {bulkActive ? (
        <>
          <p style={{ color: pt.textMuted, fontSize: 12, marginBottom: 8, lineHeight: 1.6 }}>
            Paste as many questions as you want, separated by an empty line. Every question in this box is added
            to the module, subject and lesson selected above. Format:
          </p>
          <pre style={{
            background: pt.surfaceFlat, border: `1px solid ${pt.border}`, borderRadius: 10,
            padding: 12, fontSize: 11, color: pt.sub, marginBottom: 12,
            whiteSpace: 'pre-wrap', lineHeight: 1.6, overflowX: 'auto'
          }}>{BULK_FORMAT_EXAMPLE}</pre>
          <textarea
            placeholder="Paste your questions here..."
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            style={{ ...inStyle, minHeight: 240, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
          />
        </>
      ) : (
        <>
          <textarea
            placeholder="Question"
            value={draft.question}
            onChange={e => setField('question', e.target.value)}
            style={{ ...inStyle, minHeight: 80, resize: 'vertical' }}
          />
          {OPTION_FIELDS.map(option => (
            <input
              key={option.key}
              placeholder={`Option ${option.label}`}
              value={draft[option.key]}
              onChange={e => setField(option.key, e.target.value)}
              style={inStyle}
            />
          ))}
          <label style={fieldLabel(pt)}>Correct Answer</label>
          <select value={draft.correct} onChange={e => setField('correct', e.target.value)} style={inStyle}>
            {OPTION_FIELDS.map(option => <option key={option.key} value={option.label.toLowerCase()}>{option.label}</option>)}
          </select>
          <textarea
            placeholder="Explanation (optional)"
            value={draft.explanation}
            onChange={e => setField('explanation', e.target.value)}
            style={{ ...inStyle, minHeight: 60, resize: 'vertical' }}
          />
        </>
      )}

      <AdminDetails dark={dark} title="Details" summary={detailsSummary}>
        <label style={fieldLabel(pt)}>Use In</label>
        <select value={draft.examType} onChange={e => setField('examType', e.target.value)} style={inStyle}>
          {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label style={fieldLabel(pt)}>Exam Stage (optional)</label>
        <select value={draft.examStage} onChange={e => setField('examStage', e.target.value)} style={inStyle}>
          <option value="">No specific stage</option>
          {stageOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <label style={fieldLabel(pt)}>Source (optional)</label>
        <select value={draft.source} onChange={e => setField('source', e.target.value)} style={inStyle}>
          {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </AdminDetails>
    </AdminFormCard>
  )

  const searchTerm = search.trim()

  const list = (
    <div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          placeholder="Search questions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inStyle, marginBottom: 0, paddingLeft: 34 }}
        />
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <SearchIcon2 color={pt.faint} size={14} />
        </span>
      </div>

      <AdminGroupedList
        dark={dark}
        modules={modules}
        items={questions}
        moduleOf={q => q.module_id}
        loading={loading}
        error={error}
        noun="questions"
        limitNote={`Showing the most recent ${LIST_LIMIT}${searchTerm ? ' matches' : ' — use search to find older questions'}.`}
        emptyMessage={searchTerm
          ? <><SearchIcon2 color={pt.sub} size={14} /> No questions match your search</>
          : <><ConstructionIcon color={pt.sub} size={14} /> No questions yet — add one on the left</>}
        renderItem={q => (
          <AdminRow
            key={q.id}
            dark={dark}
            noun="question"
            label={q.question}
            active={editingId === q.id}
            onEdit={() => editQuestion(q)}
            onDelete={() => del.requestDelete(q.id)}
          >
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{
                color: pt.text, fontWeight: 600, fontSize: 13, lineHeight: 1.45, margin: 0,
                wordBreak: 'break-word', overflowWrap: 'anywhere',
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
              }}>{q.question}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                  background: `${pt.cobalt}18`, border: `1px solid ${pt.cobalt}40`, color: pt.cobalt
                }}>{EXAM_TYPES.find(t => t.value === q.exam_type)?.label ?? q.exam_type}</span>
                {q.exam_stage && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                    background: `${pt.indigo}18`, border: `1px solid ${pt.indigo}40`, color: pt.indigo
                  }}>{stageLabel(q.exam_stage)}</span>
                )}
                {q.source && <QuestionSourceBadge source={q.source} />}
              </div>
            </div>
          </AdminRow>
        )}
      />
    </div>
  )

  return (
    <div>
      <InlineMessage message={message} />
      <AdminSplitLayout formWidth={420} form={form} list={list} />
      <AdminDeleteDialog dark={dark} noun="question" del={del} />
    </div>
  )
}
