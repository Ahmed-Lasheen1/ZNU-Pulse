// src/pages/Review.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth, useModules } from '../contexts'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import { glassInput } from '../components/pulse/PulseUI'
import { useToast } from '../components/ToastProvider'
import ErrorBanner from '../components/ErrorBanner'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../components/pulse/PulseBackground'
import PulseGlassRow from '../components/pulse/PulseGlassRow'
import BackButton from '../components/pulse/BackButton'
import PageIntro from '../components/pulse/PageIntro'
import { getGuestFlags, getGuestHistory, toggleGuestFlag } from '../lib/reviewStorage'
import QuestionSourceBadge from '../components/QuestionSourceBadge'
import { ModuleIcon } from '../lib/medicalIcons'
import { BookIcon, ClockIcon, FlagIcon, LightbulbIcon, TargetIcon, EmptyBoxIcon, CelebrationIcon, RefreshIcon, SearchIcon2 } from '../components/ui/tool-icons'

const REVIEW_ACCENT = '#e2725b'

const SECTION_GAP = 22
const ITEM_GAP = 16

interface ReviewModule {
  id: string
  name: string
  icon?: string | null
  color: string
}

// Snapshot of one wrong answer from a specific exam attempt — saved at
// submit time (see MCQ.tsx submitQuiz) so this page can show exactly
// what was missed in THAT attempt, independent of whatever the
// question bank looks like later.
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

interface HistoryRow {
  id?: string
  module_id?: string | null
  quiz_type: string
  subject_id?: string | null
  total: number
  correct: number
  score: number
  time_sec?: number | null
  completed_at: string | number
  incorrect_questions?: IncorrectSnapshot[] | null
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

export default function Review({ dark }: { dark: boolean }) {
  const { user } = useAuth() as { user: { id: string } | null }
  const { modules } = useModules() as { modules: ReviewModule[] }
  const navigate = useNavigate()
  const showToast = useToast() as (message: string, type?: 'success' | 'error') => void
  const pt = getPulseTheme(dark)

  const [tab, setTab] = useState<ReviewTab>('history')

  const [history, setHistory] = useState<HistoryRow[]>([])
  const [selectedHistory, setSelectedHistory] = useState<HistoryRow | null>(null)

  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')

  useEffect(() => { fetchTab() }, [tab, user])
  useEffect(() => { setSearchQuery(''); setModuleFilter('all'); setSelectedHistory(null) }, [tab])

  async function fetchTab() {
    setLoading(true)
    setLoadError(false)

    if (tab === 'history') {
      if (user) {
        const { data, error } = await supabase
          .from('exam_history')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(50)
        if (error) setLoadError(true)
        setHistory((data || []) as HistoryRow[])
      } else {
        setHistory(getGuestHistory() as HistoryRow[])
      }
      setLoading(false)
      return
    }

    // flagged
    if (user) {
      const { data, error } = await supabase.from('flagged_questions').select('question_id').eq('user_id', user.id)
      if (error) setLoadError(true)
      const ids = (data || []).map((r: any) => r.question_id)
      if (ids.length === 0) {
        setFlaggedItems([])
      } else {
        const { data: qData, error: qError } = await supabase.rpc('get_review_questions', { p_question_ids: ids })
        if (qError) setLoadError(true)
        setFlaggedItems(qData || [])
      }
    } else {
      const local = getGuestFlags()
      setFlaggedItems(local.map((q: any) => ({ ...q, attempted: !!q.explanation })))
    }
    setLoading(false)
  }

  async function unflag(questionId: string) {
    if (user) {
      await supabase.from('flagged_questions').delete().eq('user_id', user.id).eq('question_id', questionId)
    } else {
      toggleGuestFlag({ question_id: questionId })
    }
    setFlaggedItems(prev => prev.filter(i => (i.question_id || i.id) !== questionId))
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

  const optionLabels = ['a', 'b', 'c', 'd']
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

  // Shared style for the question/option/explanation blocks below so
  // long text always wraps onto as many lines as it needs instead of
  // being squeezed onto one line — previously this only "looked" fine
  // because the very wide desktop column gave short questions enough
  // room to stay on one line by coincidence, not because anything
  // enforced wrapping.
  const wrapText: React.CSSProperties = { wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal' }

  const reviewTabs = [
    { id: 'history' as const, label: 'History', Icon: ClockIcon },
    { id: 'flagged' as const, label: 'Flagged', Icon: FlagIcon },
  ]

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      {/* Narrower, centered content column — the default .pulse-wide
          class scales up to 1800px on large desktops, which made every
          card in this page stretch edge-to-edge for no real reason.
          review-wide caps out at 2/3 of that (1200px) and stays
          centered via margin:auto; below that width it behaves the
          same as any other full-width mobile page. */}
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
      <div className="review-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body, maxWidth: 900, margin: '0 auto' }}>

        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback="/mcq" />
        </div>

        <PageIntro dark={dark} emoji={<BookIcon color={ON_GRADIENT_TOP.primary} size={40} />} title="Review" subtitle="Your exam history, mistakes, and flagged questions" paddingBottom={16} />

        {/* History / Flagged pills — shrunk to ~2/3 of their previous
            size (padding + font + icon all scaled down) and no longer
            flex:1 (they used to stretch to fill the whole row width).
            justify-content:center + a modest gap keeps them together
            in the middle instead of pinned to opposite edges. */}
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

        {loading && <p style={{ color: ON_GRADIENT_TOP.secondary, textAlign: 'center' }}>Loading...</p>}

        {/* ── History tab — list of past attempts ──────────────── */}
        {tab === 'history' && !loading && !selectedHistory && (() => {
          const totalAttempted = history.reduce((a, h) => a + h.total, 0)
          const totalCorrect = history.reduce((a, h) => a + h.correct, 0)
          const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null

          return (
            <>
              {accuracy !== null && (
                <div style={{ textAlign: 'center', marginBottom: SECTION_GAP }}>
                  <span style={{ color: REVIEW_ACCENT, fontWeight: 900, fontSize: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <TargetIcon color={REVIEW_ACCENT} size={18} /> {accuracy}%
                  </span>
                  <span style={{ color: pt.sub, fontSize: 12, fontWeight: 600, marginLeft: 8 }}>
                    overall accuracy ({totalCorrect}/{totalAttempted})
                  </span>
                </div>
              )}

              {history.length === 0 && (
                <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
                  <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <EmptyBoxIcon color={pt.sub} size={16} /> No exams attempted yet
                  </p>
                </LiquidGlassCard>
              )}

              {history.map((h, i) => {
                const mod = moduleFor(h.module_id)
                const isLast = i === history.length - 1
                return (
                  <div key={h.id || i} style={{ marginBottom: isLast ? 0 : ITEM_GAP }}>
                    <LiquidGlassCard dark={dark} delay={i * 50} onClick={() => setSelectedHistory(h)} style={{
                      padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        {mod && <ModuleIcon value={mod.icon} size={20} color={mod.color} />}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ ...pulseType.cardTitle, fontSize: 14, color: pt.textPrimary }}>
                            {mod ? mod.name : 'Module'} · {h.quiz_type === 'mock' ? 'Mock' : h.quiz_type === 'retry' ? 'Retry' : 'Practice'}
                          </div>
                          <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>
                            {new Date(h.completed_at).toLocaleDateString()} · {h.correct}/{h.total} correct
                            {h.time_sec ? ` · ${Math.floor(h.time_sec / 60)}m ${h.time_sec % 60}s` : ''}
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

        {/* ── History detail — incorrect questions from ONE attempt ── */}
        {tab === 'history' && !loading && selectedHistory && (() => {
          const mod = moduleFor(selectedHistory.module_id)
          const incorrectQs = selectedHistory.incorrect_questions || []
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
                  <span style={{ ...pulseType.sectionTitle, color: mod?.color || REVIEW_ACCENT, fontSize: 18 }}>{mod ? mod.name : 'Module'}</span>
                </div>
                <div style={{ color: pt.textMuted, fontSize: 13 }}>
                  {new Date(selectedHistory.completed_at).toLocaleDateString()} · {selectedHistory.correct}/{selectedHistory.total} correct · {selectedHistory.score}%
                </div>
              </div>

              {incorrectQs.length > 0 && (
                <div style={{ marginBottom: SECTION_GAP }}>
                  <button onClick={() => retryAll(incorrectQs)} style={{
                    width: '100%', padding: '14px', background: REVIEW_ACCENT, color: '#0f172a',
                    border: 'none', borderRadius: 999, cursor: 'pointer', fontWeight: 700,
                    fontSize: 14, fontFamily: pulseFonts.body, boxShadow: `0 8px 28px ${REVIEW_ACCENT}35`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}>
                    <RefreshIcon color="#0f172a" size={15} /> Retry These {incorrectQs.length} Incorrect Question{incorrectQs.length === 1 ? '' : 's'}
                  </button>
                </div>
              )}

              {incorrectQs.length === 0 && (
                <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
                  <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {selectedHistory.correct === selectedHistory.total
                      ? <><CelebrationIcon color={pt.sub} size={16} /> No mistakes in this attempt!</>
                      : 'No per-question data was recorded for this attempt.'}
                  </p>
                </LiquidGlassCard>
              )}

              {incorrectQs.map((item, i) => {
                const isLast = i === incorrectQs.length - 1
                return (
                  <div key={item.question_id || i} style={{ marginBottom: isLast ? 0 : ITEM_GAP }}>
                    <LiquidGlassCard dark={dark} delay={i * 60} style={{ padding: '20px 22px' }}>
                      {item.source && (
                        <div style={{ marginBottom: 10 }}>
                          <QuestionSourceBadge source={item.source} />
                        </div>
                      )}
                      <p style={{ ...pulseType.cardTitle, color: pt.textPrimary, marginBottom: 12, ...wrapText }}>{item.question}</p>

                      {optionsOf(item).map((opt, ai) => {
                        const label = optionLabels[ai]
                        const isCorrect = label === item.correct_answer
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

        {/* ── Flagged tab ──────────────────────────────────────── */}
        {tab === 'flagged' && !loading && (
          <>
            {flaggedItems.length === 0 && (
              <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center', marginBottom: SECTION_GAP }}>
                <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <EmptyBoxIcon color={pt.sub} size={16} /> No flagged questions yet
                </p>
              </LiquidGlassCard>
            )}

            {flaggedItems.length > 0 && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="🔍 Search questions..."
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
                      width: '100%', padding: '14px', background: REVIEW_ACCENT, color: '#0f172a',
                      border: 'none', borderRadius: 999, cursor: 'pointer', fontWeight: 700,
                      fontSize: 14, fontFamily: pulseFonts.body, boxShadow: `0 8px 28px ${REVIEW_ACCENT}35`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                      <RefreshIcon color="#0f172a" size={15} /> Retry {filteredFlagged.length === flaggedItems.length ? 'All' : `These ${filteredFlagged.length}`} Flagged Questions
                    </button>
                  </div>
                )}
              </>
            )}

            {flaggedItems.length > 0 && filteredFlagged.length === 0 && (
              <LiquidGlassCard dark={dark} delay={0} style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <SearchIcon2 color={pt.sub} size={15} /> No matches for your search/filter
                </p>
              </LiquidGlassCard>
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
                        {item.source && <QuestionSourceBadge source={item.source} />}
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
                        <LightbulbIcon color={pt.sub} size={14} style={{ flexShrink: 0, marginTop: 2 }} />
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
      </div>
    </div>
  )
}
