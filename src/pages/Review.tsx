// src/pages/Review.tsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth, useModules } from '../contexts'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import { glassInput } from '../components/pulse/PulseUI'
import { useToast } from '../components/ToastProvider'
import ErrorBanner from '../components/ErrorBanner'
import ConfirmDialog from '../components/ConfirmDialog'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseGlassRow from '../components/pulse/PulseGlassRow'
import PageShell from '../components/pulse/PageShell'
import PageIntro from '../components/pulse/PageIntro'
import LoadingText from '../components/pulse/LoadingText'
import EmptyState from '../components/pulse/EmptyState'
import OfflineNote from '../components/pulse/OfflineNote'
import { getGuestFlags, getGuestHistory, toggleGuestFlag } from '../lib/reviewStorage'
import { listPendingAttempts, syncPendingAttempts, discardPendingAttempt, subscribePendingAttempts } from '../lib/offlineAttempts'
import { cachedSnapshot, saveCached } from '../lib/dataCache'
import { getFullAttempt } from '../lib/fullHistory'
import { fetchModuleStages } from '../lib/moduleStages'
import { quizName } from '../lib/quizNames'
import QuestionSourceBadge from '../components/QuestionSourceBadge'
import { ModuleIcon } from '../lib/medicalIcons'
import { wrapText } from '../lib/textStyles'
import { BookIcon, ClockIcon, FlagIcon, LightbulbIcon, TargetIcon, EmptyBoxIcon, CelebrationIcon, RefreshIcon, SearchIcon2 } from '../components/ui/tool-icons'
import { MCQ_ACCENT, optionLabels } from './mcq/mcqShared'

const SECTION_GAP = 22
const ITEM_GAP = 16

interface ReviewModule {
  id: string
  name: string
  icon?: string | null
  color: string
}

interface IncorrectSnapshot {
  question_id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer?: string
  explanation?: string
  module_id?: string | null
  subject_id?: string | null
  source?: string | null
}

interface ReviewItem extends IncorrectSnapshot {
  answer?: string | null
  is_correct?: boolean
}

interface FullAttempt {
  id: string
  questions: ReviewItem[]
}

interface HistoryRow {
  id?: string
  module_id?: string | null
  quiz_type: string
  stage?: string | null
  subject_id?: string | null
  total: number
  correct: number
  score: number
  time_sec?: number | null
  completed_at: string | number
  incorrect_questions?: IncorrectSnapshot[] | null
  pending?: { id: string; error: string | null }
}

interface FlaggedItem {
  id?: string
  question_id?: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer?: string
  explanation?: string
  module_id?: string
  subject_id?: string
  source?: string
  attempted?: boolean
}

type ReviewTab = 'history' | 'flagged'
type DetailFilter = 'incorrect' | 'all'

function pendingToHistoryRow(attempt: any): HistoryRow {
  return {
    id: `pending-${attempt.id}`,
    module_id: attempt.moduleId,
    quiz_type: attempt.quizType,
    stage: attempt.stage,
    subject_id: attempt.subjectId,
    total: attempt.total,
    correct: attempt.correct,
    score: attempt.score,
    time_sec: attempt.timeSec,
    completed_at: attempt.completedAt,
    incorrect_questions: attempt.incorrectQuestions,
    pending: { id: attempt.id, error: attempt.error },
  }
}

export default function Review({ dark }: { dark: boolean }) {
  const { user } = useAuth() as { user: { id: string } | null }
  const { modules } = useModules() as { modules: ReviewModule[] }
  const navigate = useNavigate()
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void
  const pt = getPulseTheme(dark)

  const [tab, setTab] = useState<ReviewTab>('history')

  const [history, setHistory] = useState<HistoryRow[]>([])
  const [selectedHistory, setSelectedHistory] = useState<HistoryRow | null>(null)
  const [syncTick, setSyncTick] = useState(0)
  const [syncBusy, setSyncBusy] = useState(false)
  const [confirmDiscardId, setConfirmDiscardId] = useState<string | null>(null)
  const [stageTitles, setStageTitles] = useState<Record<string, string>>({})
  const [fullAttempt, setFullAttempt] = useState<FullAttempt | null>(null)
  const [detailFilter, setDetailFilter] = useState<DetailFilter>('incorrect')

  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [savedCopy, setSavedCopy] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')

  const flagEditedAtRef = useRef(0)

  useEffect(() => subscribePendingAttempts(() => { setSyncTick(t => t + 1); setSelectedHistory(null) }), [])

  useEffect(() => {
    let ignore = false
    fetchTab(() => ignore)
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user, syncTick])
  useEffect(() => { setSearchQuery(''); setModuleFilter('all'); setSelectedHistory(null) }, [tab])

  useEffect(() => {
    const moduleIds = [...new Set(history.filter(h => h.stage && h.module_id).map(h => h.module_id as string))]
    if (moduleIds.length === 0) return
    let ignore = false
    Promise.all(moduleIds.map(async id => [id, await fetchModuleStages(id)] as const)).then(entries => {
      if (ignore) return
      const next: Record<string, string> = {}
      entries.forEach(([id, list]) => list.forEach((s: any) => { next[`${id}:${s.value}`] = s.title }))
      setStageTitles(next)
    })
    return () => { ignore = true }
  }, [history])

  useEffect(() => {
    setFullAttempt(null)
    setDetailFilter('incorrect')
    if (!selectedHistory) return
    let ignore = false
    getFullAttempt(selectedHistory.pending?.id || selectedHistory.id).then(found => { if (!ignore) setFullAttempt(found as FullAttempt | null) })
    return () => { ignore = true }
  }, [selectedHistory])

  const historyName = (h: HistoryRow) =>
    quizName(h.quiz_type, h.stage && h.module_id ? stageTitles[`${h.module_id}:${h.stage}`] : undefined)

  const flaggedKey = (userId: string) => `user:${userId}:review-flagged`

  async function fetchTab(isIgnored: () => boolean = () => false) {
    setLoading(true)
    setLoadError(false)

    if (tab === 'history') {
      if (user) {
        const pending = await listPendingAttempts(user.id)
        const pendingRows = [...pending].reverse().map(pendingToHistoryRow)
        const { data, error, fromCache } = await cachedSnapshot(`user:${user.id}:review-history`, () => supabase
          .from('exam_history')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(50), {
            onUpdate: fresh => {
              if (isIgnored() || !fresh) return
              setHistory([...pendingRows, ...(fresh as HistoryRow[])])
            },
          })
        if (isIgnored()) return
        if (error) setLoadError(true)
        setSavedCopy(fromCache)
        setHistory([...pendingRows, ...((data || []) as HistoryRow[])])
      } else {
        if (isIgnored()) return
        setSavedCopy(false)
        setHistory(getGuestHistory() as HistoryRow[])
      }
      if (isIgnored()) return
      setLoading(false)
      return
    }

    if (user) {
      const startedAt = Date.now()
      const { data, error, fromCache } = await cachedSnapshot(flaggedKey(user.id), async () => {
        const flagRes = await supabase.from('flagged_questions').select('question_id').eq('user_id', user.id)
        if (flagRes.error) return { data: null, error: flagRes.error }
        const ids = (flagRes.data || []).map((r: any) => r.question_id)
        if (ids.length === 0) return { data: [], error: null }
        return supabase.rpc('get_review_questions', { p_question_ids: ids })
      }, {
        onUpdate: fresh => {
          if (isIgnored() || !fresh || startedAt < flagEditedAtRef.current) return
          setFlaggedItems(fresh as FlaggedItem[])
        },
      })
      if (isIgnored()) return
      if (error) setLoadError(true)
      setSavedCopy(fromCache)
      setFlaggedItems((data || []) as FlaggedItem[])
    } else {
      const local = getGuestFlags()
      if (isIgnored()) return
      setSavedCopy(false)
      setFlaggedItems(local.map((q: any) => ({ ...q, attempted: !!q.explanation })))
    }
    if (isIgnored()) return
    setLoading(false)
  }

  async function retrySync() {
    if (!user || syncBusy) return
    setSyncBusy(true)
    const { synced, rejected } = await syncPendingAttempts(user.id, { includeFailed: true })
    setSyncBusy(false)
    if (synced > 0) showToast('✅ Attempt synced')
    else if (rejected > 0) showToast("❌ The server couldn't accept this attempt — see the message above", 'error')
    else showToast("Still waiting — it will sync automatically once you're online", 'info')
  }

  async function unflag(questionId: string) {
    if (user) {
      if (!navigator.onLine) { showToast("You're offline — try again when you're connected", 'info'); return }
      const { error } = await supabase.from('flagged_questions').delete().eq('user_id', user.id).eq('question_id', questionId)
      if (error) { showToast('❌ Could not remove flag — try again', 'error'); return }
    } else {
      toggleGuestFlag({ question_id: questionId })
    }
    flagEditedAtRef.current = Date.now()
    const next = flaggedItems.filter(i => (i.question_id || i.id) !== questionId)
    setFlaggedItems(next)
    if (user) saveCached(flaggedKey(user.id), next)
    showToast('Flag removed')
  }

  function retryAll(list: any[]) {
    const retryQuestions = list.map((item: any) => ({
      id: item.question_id || item.id,
      question: item.question,
      option_a: item.option_a, option_b: item.option_b, option_c: item.option_c, option_d: item.option_d,
      module_id: item.module_id, subject_id: item.subject_id
    }))
    navigate('/mcq', { state: { retryQuestions } })
  }

  function moduleFor(id?: string | null) { return modules.find(m => m.id === id) }

  const optionsOf = (item: { option_a: string; option_b: string; option_c: string; option_d: string }) =>
    [item.option_a, item.option_b, item.option_c, item.option_d]

  const filteredFlagged = flaggedItems.filter(item => {
    const matchesModule = moduleFilter === 'all' || item.module_id === moduleFilter
    const matchesSearch = !searchQuery.trim() || item.question.toLowerCase().includes(searchQuery.trim().toLowerCase())
    return matchesModule && matchesSearch
  })

  const modulesInFlagged = [...new Set(flaggedItems.map(i => i.module_id).filter(Boolean))] as string[]
  const showModuleFilter = modulesInFlagged.length > 1

  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'
  const inStyle = { ...glassInput(pt, dark), padding: '13px 20px', marginBottom: 0 }

  const reviewTabs = [
    { id: 'history' as const, label: 'History', Icon: ClockIcon },
    { id: 'flagged' as const, label: 'Flagged', Icon: FlagIcon },
  ]

  return (
    <PageShell dark={dark} backFallback="/mcq" maxWidth={900} containerClassName="review-wide">
      <style>{`
        .review-wide {
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
          padding: 0 20px;
          box-sizing: border-box;
        }
        @media (min-width: 900px) {
          .review-wide { padding: 0 40px; }
        }
        @media (min-width: 1400px) {
          .review-wide { padding: 0 64px; }
        }
      `}</style>

      <PageIntro dark={dark} emoji={<BookIcon color={ON_GRADIENT_TOP.primary} size={40} />} title="Review" subtitle="Your exam history, mistakes, and flagged questions" paddingBottom={16} />

      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: SECTION_GAP }}>
        {reviewTabs.map(t => {
          const active = tab === t.id
          const color = active ? (dark ? '#ffffff' : '#062B50') : pt.sub
          return (
            <PulseGlassRow
              key={t.id} dark={dark} radius={999} active={active}
              activeTint={`${pt.cobalt}26`} hoverTint={hoverTint}
              onClick={() => setTab(t.id)} role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTab(t.id) } }}
              style={{ textAlign: 'center', width: 150 }}
            >
              <div style={{ padding: '11px 0', ...pulseType.button, fontSize: 14, color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <t.Icon color={color} size={15} /> {t.label}
              </div>
            </PulseGlassRow>
          )
        })}
      </div>

      {loadError && <ErrorBanner />}
      {savedCopy && !loading && <OfflineNote dark={dark} message="You're offline — showing your last saved review data." />}

      {!user && (
        <div style={{ marginBottom: SECTION_GAP }}>
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: '12px 18px', textAlign: 'center' }}>
            <span style={{ color: pt.cobalt, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LightbulbIcon color={pt.cobalt} size={14} /> This list is saved on this device only.{' '}
              <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/auth')}>Sign in</span>{' '}
              to keep it across devices.
            </span>
          </LiquidGlassCard>
        </div>
      )}

      {loading && <LoadingText />}

      {tab === 'history' && !loading && !selectedHistory && (() => {
        const totalAttempted = history.reduce((a, h) => a + h.total, 0)
        const totalCorrect = history.reduce((a, h) => a + h.correct, 0)
        const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null

        return (
          <>
            {accuracy !== null && (
              <div style={{ textAlign: 'center', marginBottom: SECTION_GAP }}>
                <span style={{ color: MCQ_ACCENT, fontWeight: 900, fontSize: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <TargetIcon color={MCQ_ACCENT} size={18} /> {accuracy}%
                </span>
                <span style={{ color: pt.sub, fontSize: 12, fontWeight: 600, marginLeft: 8 }}>
                  overall accuracy ({totalCorrect}/{totalAttempted})
                </span>
              </div>
            )}

            {history.length === 0 && (
              <EmptyState dark={dark} icon={<EmptyBoxIcon color={pt.sub} size={16} />} message="No exams attempted yet" />
            )}

            {history.map((h, i) => {
              const mod = moduleFor(h.module_id)
              const isLast = i === history.length - 1
              const rowKey = h.id || `${h.completed_at}-${i}`
              return (
                <div key={rowKey} style={{ marginBottom: isLast ? 0 : ITEM_GAP }}>
                  <LiquidGlassCard dark={dark} delay={i * 50} onClick={() => setSelectedHistory(h)} style={{
                    padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      {mod && <ModuleIcon value={mod.icon} size={20} color={mod.color} />}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ ...pulseType.cardTitle, fontSize: 14, color: pt.textPrimary }}>
                          {mod ? mod.name : 'Module'} · {historyName(h)}
                        </div>
                        <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>
                          {new Date(h.completed_at).toLocaleDateString()} · {h.correct}/{h.total} correct
                          {h.time_sec ? ` · ${Math.floor(h.time_sec / 60)}m ${h.time_sec % 60}s` : ''}
                          {h.pending && (
                            <span style={{ color: h.pending.error ? pt.danger : pt.amber, fontWeight: 700 }}>
                              {' '}· {h.pending.error ? 'Sync failed' : 'Pending sync'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      background: h.score >= 60 ? 'rgba(74,222,128,0.16)' : 'rgba(239,107,87,0.16)',
                      color: h.score >= 60 ? pt.success : pt.danger,
                      borderRadius: 999, padding: '4px 14px', fontWeight: 900, fontSize: 14, flexShrink: 0
                    }}>{h.score}%</div>
                  </LiquidGlassCard>
                </div>
              )
            })}
          </>
        )
      })()}

      {tab === 'history' && !loading && selectedHistory && (() => {
        const mod = moduleFor(selectedHistory.module_id)
        const pending = selectedHistory.pending
        const incorrectItems: ReviewItem[] = fullAttempt
          ? fullAttempt.questions.filter(q => !q.is_correct)
          : (selectedHistory.incorrect_questions || [])
        const shownItems = fullAttempt && detailFilter === 'all' ? fullAttempt.questions : incorrectItems
        const detailTabs = fullAttempt ? [
          { id: 'incorrect' as const, label: `Incorrect (${incorrectItems.length})` },
          { id: 'all' as const, label: `All (${fullAttempt.questions.length})` },
        ] : []
        return (
          <div>
            <div style={{ marginBottom: SECTION_GAP }}>
              <PulseGlassRow dark={dark} radius={999} hoverTint={hoverTint} onClick={() => setSelectedHistory(null)}
                role="button" tabIndex={0} style={{ display: 'inline-block' }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedHistory(null) } }}>
                <div style={{ padding: '8px 18px', ...pulseType.small, fontWeight: 700, color: pt.sub }}>← Back to history</div>
              </PulseGlassRow>
            </div>

            <div style={{ textAlign: 'center', marginBottom: SECTION_GAP }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {mod && <ModuleIcon value={mod.icon} size={20} color={mod.color} />}
                <span style={{ ...pulseType.sectionTitle, color: mod?.color || MCQ_ACCENT, fontSize: 18 }}>{mod ? mod.name : 'Module'}</span>
              </div>
              <div style={{ color: pt.sub, fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{historyName(selectedHistory)}</div>
              <div style={{ color: pt.textMuted, fontSize: 13 }}>
                {new Date(selectedHistory.completed_at).toLocaleDateString()} · {selectedHistory.correct}/{selectedHistory.total} correct · {selectedHistory.score}%
              </div>
            </div>

            {pending && (
              <div style={{ marginBottom: SECTION_GAP }}>
                <LiquidGlassCard dark={dark} delay={0} style={{ padding: '14px 18px', textAlign: 'center' }}>
                  <div style={{ color: pending.error ? pt.danger : pt.amber, fontSize: 13, fontWeight: 700, marginBottom: 12, ...wrapText }}>
                    {pending.error
                      ? `Couldn't sync: ${pending.error}`
                      : "Saved on this device — waiting to sync. Points are added when it syncs."}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                    <PulseGlassRow dark={dark} radius={999} hoverTint={hoverTint} onClick={retrySync}
                      role="button" tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); retrySync() } }}>
                      <div style={{ padding: '8px 18px', ...pulseType.small, fontWeight: 700, color: pt.sub, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <RefreshIcon color={pt.sub} size={13} /> {syncBusy ? 'Syncing...' : 'Retry sync'}
                      </div>
                    </PulseGlassRow>
                    <PulseGlassRow dark={dark} radius={999} hoverTint={hoverTint} onClick={() => setConfirmDiscardId(pending.id)}
                      role="button" tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setConfirmDiscardId(pending.id) } }}>
                      <div style={{ padding: '8px 18px', ...pulseType.small, fontWeight: 700, color: pt.danger }}>Remove</div>
                    </PulseGlassRow>
                  </div>
                </LiquidGlassCard>
              </div>
            )}

            {detailTabs.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: SECTION_GAP }}>
                {detailTabs.map(t => {
                  const active = detailFilter === t.id
                  return (
                    <PulseGlassRow
                      key={t.id} dark={dark} radius={999} active={active}
                      activeTint={`${pt.cobalt}26`} hoverTint={hoverTint}
                      onClick={() => setDetailFilter(t.id)} role="button" tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailFilter(t.id) } }}
                    >
                      <div style={{ padding: '8px 18px', ...pulseType.small, fontWeight: 700, color: active ? pt.cobalt : pt.sub }}>{t.label}</div>
                    </PulseGlassRow>
                  )
                })}
              </div>
            )}

            {!fullAttempt && incorrectItems.length > 0 && (
              <p style={{ color: pt.textMuted, fontSize: 12, textAlign: 'center', marginBottom: SECTION_GAP, ...wrapText }}>
                Only the incorrect questions are shown — full details are only saved on the device where the exam was taken.
              </p>
            )}

            {incorrectItems.length > 0 && (
              <div style={{ marginBottom: SECTION_GAP }}>
                <button onClick={() => retryAll(incorrectItems)} style={{
                  width: '100%', padding: '14px', background: MCQ_ACCENT, color: '#0f172a',
                  border: 'none', borderRadius: 999, cursor: 'pointer', fontWeight: 700,
                  fontSize: 14, fontFamily: pulseFonts.body, boxShadow: `0 8px 28px ${MCQ_ACCENT}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}>
                  <RefreshIcon color="#0f172a" size={15} /> Retry These {incorrectItems.length} Incorrect Question{incorrectItems.length === 1 ? '' : 's'}
                </button>
              </div>
            )}

            {shownItems.length === 0 && (
              <EmptyState
                dark={dark}
                message={
                  selectedHistory.correct === selectedHistory.total
                    ? <><CelebrationIcon color={pt.sub} size={16} /> No mistakes in this attempt!</>
                    : 'No per-question data was recorded for this attempt.'
                }
              />
            )}

            {shownItems.map((item, i) => {
              const isLast = i === shownItems.length - 1
              return (
                <div key={item.question_id || i} style={{ marginBottom: isLast ? 0 : ITEM_GAP }}>
                  <LiquidGlassCard dark={dark} delay={i * 60} style={{ padding: '20px 22px' }}>
                    {(item.source || item.is_correct !== undefined) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        {item.is_correct !== undefined && (
                          <span style={{
                            fontSize: 11, fontWeight: 800, letterSpacing: 0.5, padding: '2px 9px', borderRadius: 20,
                            background: item.is_correct ? 'rgba(74,222,128,0.16)' : 'rgba(248,113,113,0.16)',
                            color: item.is_correct ? '#4ade80' : '#f87171'
                          }}>{item.is_correct ? '✓ CORRECT' : item.answer ? '✕ INCORRECT' : '— UNANSWERED'}</span>
                        )}
                        {item.source && <QuestionSourceBadge source={item.source} dark={dark} />}
                      </div>
                    )}
                    <p style={{ ...pulseType.cardTitle, color: pt.textPrimary, marginBottom: 12, ...wrapText }}>{item.question}</p>

                    {optionsOf(item).map((opt, ai) => {
                      const label = optionLabels[ai]
                      const isCorrect = label === item.correct_answer
                      const isChosenWrong = !isCorrect && !!item.answer && item.answer === label
                      return (
                        <div key={ai} style={{
                          background: isCorrect ? '#064e3b' : isChosenWrong ? 'rgba(248,113,113,0.16)' : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                          border: `1px solid ${isCorrect ? '#4ade80' : isChosenWrong ? '#f87171' : pt.border}`,
                          borderRadius: 10, padding: '9px 14px', marginBottom: 6,
                          color: isCorrect ? '#4ade80' : isChosenWrong ? '#f87171' : pt.sub, fontSize: 13, fontWeight: 600,
                          display: 'flex', alignItems: 'flex-start', gap: 6, ...wrapText
                        }}>
                          <span style={{ flexShrink: 0 }}>{label.toUpperCase()}.</span>
                          <span style={wrapText}>{opt}</span>
                        </div>
                      )
                    })}

                    {item.explanation && (
                      <div style={{
                        background: dark ? 'rgba(56,189,248,0.10)' : 'rgba(2,132,199,0.06)',
                        borderRadius: 10, padding: '10px 14px', marginTop: 8, color: pt.sub, fontSize: 12,
                        display: 'flex', alignItems: 'flex-start', gap: 8
                      }}>
                        <LightbulbIcon color={pt.sub} size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={wrapText}>{item.explanation}</span>
                      </div>
                    )}

                    <div style={{ marginTop: 14 }}>
                      <PulseGlassRow dark={dark} radius={10} hoverTint={hoverTint} onClick={() => retryAll([item])}
                        role="button" tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); retryAll([item]) } }}>
                        <div style={{ padding: '8px', textAlign: 'center', color: pt.sub, ...pulseType.small, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <RefreshIcon color={pt.sub} size={13} /> Retry this one
                        </div>
                      </PulseGlassRow>
                    </div>
                  </LiquidGlassCard>
                </div>
              )
            })}
          </div>
        )
      })()}

      {tab === 'flagged' && !loading && (
        <>
          {flaggedItems.length === 0 && (
            <div style={{ marginBottom: SECTION_GAP }}>
              <EmptyState dark={dark} icon={<EmptyBoxIcon color={pt.sub} size={16} />} message="No flagged questions yet" />
            </div>
          )}

          {flaggedItems.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search questions..."
                  aria-label="Search flagged questions"
                  style={{ ...inStyle, flex: 1, minWidth: 160 }}
                />
                {showModuleFilter && (
                  <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} style={{ ...inStyle, width: 'auto' }}>
                    <option value="all">All modules</option>
                    {modulesInFlagged.map(id => {
                      const mod = moduleFor(id)
                      return <option key={id} value={id}>{mod ? mod.name : id}</option>
                    })}
                  </select>
                )}
              </div>

              {filteredFlagged.length > 0 && (
                <div style={{ marginBottom: SECTION_GAP }}>
                  <button onClick={() => retryAll(filteredFlagged)} style={{
                    width: '100%', padding: '14px', background: MCQ_ACCENT, color: '#0f172a',
                    border: 'none', borderRadius: 999, cursor: 'pointer', fontWeight: 700,
                    fontSize: 14, fontFamily: pulseFonts.body, boxShadow: `0 8px 28px ${MCQ_ACCENT}35`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}>
                    <RefreshIcon color="#0f172a" size={15} /> Retry {filteredFlagged.length === flaggedItems.length ? 'All' : `These ${filteredFlagged.length}`} Flagged Questions
                  </button>
                </div>
              )}
            </>
          )}

          {flaggedItems.length > 0 && filteredFlagged.length === 0 && (
            <EmptyState dark={dark} icon={<SearchIcon2 color={pt.sub} size={15} />} message="No matches for your search/filter" style={{ padding: 32 }} />
          )}

          {filteredFlagged.map((item, i) => {
            const qId = (item.question_id || item.id) as string
            const mod = moduleFor(item.module_id)
            const isLast = i === filteredFlagged.length - 1
            return (
              <div key={qId} style={{ marginBottom: isLast ? 0 : ITEM_GAP }}>
                <LiquidGlassCard dark={dark} delay={i * 60} style={{ padding: '20px 22px' }}>
                  {(mod || item.source) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      {mod && (
                        <div style={{ color: mod.color, ...pulseType.small, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ModuleIcon value={mod.icon} size={14} color={mod.color} /> {mod.name}
                        </div>
                      )}
                      {item.source && <QuestionSourceBadge source={item.source} dark={dark} />}
                    </div>
                  )}
                  <p style={{ ...pulseType.cardTitle, color: pt.textPrimary, marginBottom: 12, ...wrapText }}>{item.question}</p>

                  {optionsOf(item).map((opt, ai) => {
                    const label = optionLabels[ai]
                    const isCorrect = item.attempted && label === item.correct_answer
                    return (
                      <div key={ai} style={{
                        background: isCorrect ? '#064e3b' : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                        border: `1px solid ${isCorrect ? '#4ade80' : pt.border}`,
                        borderRadius: 10, padding: '9px 14px', marginBottom: 6,
                        color: isCorrect ? '#4ade80' : pt.sub, fontSize: 13, fontWeight: 600,
                        display: 'flex', alignItems: 'flex-start', gap: 6, ...wrapText
                      }}>
                        <span style={{ flexShrink: 0 }}>{label.toUpperCase()}.</span>
                        <span style={wrapText}>{opt}</span>
                      </div>
                    )
                  })}

                  {item.attempted && item.explanation && (
                    <div style={{
                      background: dark ? 'rgba(56,189,248,0.10)' : 'rgba(2,132,199,0.06)',
                      borderRadius: 10, padding: '10px 14px', marginTop: 8, color: pt.sub, fontSize: 12,
                      display: 'flex', alignItems: 'flex-start', gap: 8
                    }}>
                      <LightbulbIcon color={pt.sub} size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={wrapText}>{item.explanation}</span>
                    </div>
                  )}
                  {!item.attempted && (
                    <div style={{ color: pt.faint, fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>
                      Answer it in a quiz to see the correct answer here.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <PulseGlassRow dark={dark} radius={10} hoverTint={hoverTint} onClick={() => retryAll([item])}
                      role="button" tabIndex={0} style={{ flex: 1 }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); retryAll([item]) } }}>
                      <div style={{ padding: '8px', textAlign: 'center', color: pt.sub, ...pulseType.small, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <RefreshIcon color={pt.sub} size={13} /> Retry this one
                      </div>
                    </PulseGlassRow>
                    <button onClick={() => unflag(qId)} style={{
                      padding: '8px 12px', background: 'transparent', border: '1px solid #ef444440',
                      borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontFamily: pulseFonts.body,
                      fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5
                    }}><FlagIcon color="#ef4444" size={12} /> Remove</button>
                  </div>
                </LiquidGlassCard>
              </div>
            )
          })}
        </>
      )}

      <ConfirmDialog
        dark={dark}
        open={!!confirmDiscardId}
        title="Remove this attempt?"
        message="It hasn't synced yet, so it will be lost permanently."
        confirmLabel="Remove"
        confirmColor={pt.danger}
        onCancel={() => setConfirmDiscardId(null)}
        onConfirm={() => { const id = confirmDiscardId; setConfirmDiscardId(null); if (id) discardPendingAttempt(id) }}
      />
    </PageShell>
  )
}
