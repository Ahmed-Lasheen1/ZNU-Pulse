// src/pages/mcq/MCQExamFlow.tsx
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import { getPulseTheme, pulseFonts, pulseType } from '../../premiumTheme'
import QuestionRail from '../../components/QuestionRail'
import QuestionSourceBadge from '../../components/QuestionSourceBadge'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseGlassRow from '../../components/pulse/PulseGlassRow'
import ConfirmDialog from '../../components/ConfirmDialog'
import { FlagIcon, SearchIcon2, LightbulbIcon } from '../../components/ui/tool-icons'
import { wrapText } from '../../lib/textStyles'
import { MCQ_ACCENT, EXAM_TOP_TEXT, EXAM_TOP_TEXT_MUTED, EXAM_LOW_TEXT, EXAM_LOW_SECONDARY, EXAM_LOW_TEXT_MUTED, EXAM_LOW_SHADOW, EXAM_DIVIDER, optionLabels, optionTexts, formatTime, StatChip, InfoTag, accuracyTier, accuracyColor } from './mcqShared'

interface MCQExamFlowProps {
  dark: boolean
  quizMode: string
  submitted: boolean
  grading: boolean
  quizQuestions: any[]
  answers: Record<number, string>
  results: Record<string, any>
  flaggedIds: Set<string>
  struckOut: Record<number, Set<string>>
  currentIndex: number
  setCurrentIndex: (updater: number | ((i: number) => number)) => void
  elapsedSeconds: number
  finishTimeSec: number
  fontScale: number
  cycleFontScale: () => void
  showReview: boolean
  setShowReview: (v: boolean) => void
  subjects: any[]
  lessons: any[]
  lessonFilter: string | null
  stopQuiz: () => void
  submitQuiz: () => void
  tryAgain: () => void
  startTargetedPractice: (subjectId: string) => void
  selectAnswer: (qi: number, opt: string) => void
  toggleStrike: (qi: number, label: string) => void
  toggleFlagFor: (q: any) => void
  goPrev: () => void
  goNext: () => void
}

function glassPillBtn(overrides: React.CSSProperties = {}): React.CSSProperties {
  return {
    background: 'rgba(1,12,74,0.28)',
    border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999,
    color: EXAM_LOW_TEXT, textShadow: EXAM_LOW_SHADOW,
    cursor: 'pointer', fontWeight: 700, fontSize: 13, letterSpacing: 0.5, fontFamily: pulseFonts.body,
    ...overrides
  }
}
function solidPillBtn(pt: ReturnType<typeof getPulseTheme>): React.CSSProperties {
  return {
    flex: 1, background: pt.cobalt, border: 'none', borderRadius: 999, padding: '13px',
    color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, letterSpacing: 0.5, fontFamily: pulseFonts.body
  }
}

const BAR_Z_INDEX = 450
const BAR_TINT = 'rgba(1,12,74,0.55)'

const barBtnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  height: 46, padding: 0, boxSizing: 'border-box', borderRadius: 999, cursor: 'pointer',
  fontFamily: pulseFonts.body, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
}

function TopGlassButton({ dark, onClick, ariaLabel, style, children }: {
  dark: boolean; onClick: () => void; ariaLabel: string; children: React.ReactNode
}) {
  const pt = getPulseTheme(dark)
  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'
  return (
    <PulseGlassRow
      dark={dark} radius={999} hoverTint={hoverTint} onClick={onClick}
      role="button" tabIndex={0} aria-label={ariaLabel}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
    >
      <div className="exam-top-btn" style={{
        height: 44, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontFamily: pulseFonts.body, fontSize: 14, fontWeight: 700, color: pt.sub, whiteSpace: 'nowrap',
      }}>{children}</div>
    </PulseGlassRow>
  )
}

export default function MCQExamFlow({
  dark, quizMode, submitted, grading, quizQuestions, answers, results,
  flaggedIds, struckOut, currentIndex, setCurrentIndex,
  elapsedSeconds, finishTimeSec, fontScale, cycleFontScale,
  showReview, setShowReview, subjects, lessons, lessonFilter,
  stopQuiz, submitQuiz, tryAgain, startTargetedPractice,
  selectAnswer, toggleStrike, toggleFlagFor, goPrev, goNext
}: MCQExamFlowProps) {
  const pt = getPulseTheme(dark)
  const isTutorMode = quizMode === 'practice' || quizMode === 'retry'
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const [barHeight, setBarHeight] = useState(96)

  function getScore() {
    return quizQuestions.filter(q => results[q.id]?.is_correct).length
  }

  const score = submitted ? getScore() : 0
  const total = quizQuestions.length
  const percent = total > 0 ? Math.round((score / total) * 100) : 0

  const resultColor = accuracyColor(percent, pt)
  const resultVerdict = {
    excellent: 'EXCELLENT.',
    great: 'GREAT WORK.',
    good: 'GOOD WORK.',
    keep_practicing: 'KEEP PRACTICING.',
    needs_work: "DON'T GIVE UP.",
  }[accuracyTier(percent)]

  const answeredIndexes = new Set(Object.keys(answers).map(Number))
  const flaggedIndexes = new Set(quizQuestions.map((q, i) => flaggedIds.has(q.id) ? i : null).filter((i): i is number => i !== null))
  const safeIndex = total > 0 ? Math.min(currentIndex, total - 1) : 0
  const currentQuestion = total > 0 ? quizQuestions[safeIndex] : null
  const answeredCount = Object.keys(answers).length
  const isLastQuestion = safeIndex === total - 1
  const remainingUnanswered = total - answeredCount
  const barVisible = !submitted && !grading && !!currentQuestion
  const currentFlagged = !!currentQuestion && flaggedIds.has(currentQuestion.id)

  function requestExit() {
    if (!submitted && answeredCount > 0) setConfirmExitOpen(true)
    else stopQuiz()
  }

  useEffect(() => {
    if (!barVisible) return
    const el = barRef.current
    if (!el) return
    const update = () => {
      const h = el.offsetHeight
      setBarHeight(h)
      document.documentElement.style.setProperty('--toast-bottom', `${h + 12}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.removeProperty('--toast-bottom')
    }
  }, [barVisible])

  const subjectStats = submitted ? (() => {
    const map: Record<string, { name: string; total: number; correct: number }> = {}
    quizQuestions.forEach(q => {
      const r = results[q.id]
      if (!q.subject_id || !r) return
      if (!map[q.subject_id]) {
        const subj = subjects.find(s => s.id === q.subject_id)
        map[q.subject_id] = { name: subj?.name || 'Other', total: 0, correct: 0 }
      }
      map[q.subject_id].total++
      if (r.is_correct) map[q.subject_id].correct++
    })
    return Object.entries(map).map(([id, v]) => ({
      id, name: v.name, total: v.total, correct: v.correct,
      incorrect: v.total - v.correct,
      accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0
    })).sort((a, b) => a.accuracy - b.accuracy)
  })() : []
  const weakestSubject = subjectStats.find(s => s.incorrect > 0) || null

  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <style>{`
        .exam-option { transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease; }
        .exam-option:hover { background: var(--opt-hover-bg); }
        .exam-option:active { transform: scale(0.985); }
        .exam-option:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }
        .exam-btn { transition: opacity 0.15s ease, transform 0.12s ease; }
        .exam-btn:active { transform: scale(0.97); }
        .exam-btn:disabled:active { transform: none; }
        .kbd-hint { display: none; }
        @media (hover: hover) and (pointer: fine) { .kbd-hint { display: block; } }
        .exam-top-btn { width: 96px; }
        .exam-top-label { display: inline; }
        .exam-bar-label { display: inline; }
        .exam-bar-nav { width: 124px; }
        .exam-bar-flag { width: 112px; }
        @media (max-width: 460px) {
          .exam-bar-label { display: none; }
          .exam-top-label { display: none; }
          .exam-top-btn { width: 44px; }
          .exam-bar-nav, .exam-bar-flag { width: 46px; }
          .exam-bar-nav.exam-bar-wide { width: 96px; }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative', zIndex: 1,
          maxWidth: 'min(1080px, 92vw)', margin: '0 auto',
          padding: `12px clamp(16px, 3vw, 36px) ${barVisible ? barHeight + 16 : 16}px`, fontFamily: pulseFonts.body
        }}
      >
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          alignItems: 'center', columnGap: 8, paddingBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            {!submitted && !grading && (
              <TopGlassButton
                dark={dark} onClick={cycleFontScale}
                ariaLabel={`Adjust text size (currently ${Math.round(fontScale * 100)}%)`}
              >
                <span style={{ fontSize: 17, fontWeight: 800 }}>Aa</span>
                <span className="exam-top-label" style={{ fontSize: 12, opacity: 0.8 }}>{Math.round(fontScale * 100)}%</span>
              </TopGlassButton>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: EXAM_TOP_TEXT_MUTED }}>ZNU · EXAM MODE</div>

            {!submitted && !grading && total > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: EXAM_TOP_TEXT, marginTop: 8 }}>
                  QUESTION {safeIndex + 1} / {total}
                </div>
                {/* Stopwatch — counts up, same for every mode, no limit/auto-submit. */}
                <div style={{
                  fontFamily: 'monospace', fontWeight: 800, fontSize: 24, marginTop: 8,
                  color: EXAM_TOP_TEXT
                }}>
                  {formatTime(elapsedSeconds)}
                </div>
              </>
            )}
            {grading && (
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: EXAM_TOP_TEXT, marginTop: 8 }}>GRADING…</div>
            )}
            {submitted && (
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: EXAM_TOP_TEXT, marginTop: 8 }}>RESULTS</div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <TopGlassButton dark={dark} onClick={requestExit} ariaLabel="Exit exam">
              <X size={18} aria-hidden />
              <span className="exam-top-label">Exit</span>
            </TopGlassButton>
          </div>
        </div>

        {total === 0 && !submitted && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <h2 style={{ color: MCQ_ACCENT, fontSize: 16 }}>No questions available yet!</h2>
          </div>
        )}

        {grading && (
          <div style={{ textAlign: 'center', padding: 24, color: EXAM_LOW_TEXT, textShadow: EXAM_LOW_SHADOW, fontSize: 14 }}>Grading...</div>
        )}

        {!submitted && !grading && currentQuestion && (
          <>
            <div style={{ height: 1, background: EXAM_DIVIDER, marginBottom: 16 }} />

            <QuestionRail
              total={total}
              currentIndex={safeIndex}
              answeredIndexes={answeredIndexes}
              flaggedIndexes={flaggedIndexes}
              onGoTo={setCurrentIndex}
              dark={dark}
              accent={MCQ_ACCENT}
            />

            <LiquidGlassCard dark={dark} delay={0} style={{
              minHeight: 'clamp(320px, 58vh, 760px)', boxSizing: 'border-box',
              padding: 'clamp(20px, 3vh, 40px) clamp(22px, 3.5vw, 44px)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              overflowY: 'auto', overflowX: 'hidden', marginBottom: 14
            }}>
              {(() => {
                const subj = subjects.find(s => s.id === currentQuestion.subject_id)
                const lesson = lessons.find(l => l.id === currentQuestion.lesson_id)
                const showSubjectTag = quizMode === 'mock' && !!subj
                const showLessonTag = !lessonFilter && !!lesson
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 14, flexShrink: 0 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 30, height: 24, padding: '0 9px', borderRadius: 8,
                      background: `${MCQ_ACCENT}22`, border: `1px solid ${MCQ_ACCENT}55`,
                      color: MCQ_ACCENT, fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap'
                    }}>Q{safeIndex + 1}</span>
                    {showSubjectTag && <InfoTag label={subj.name} color={subj.color || '#34d399'} />}
                    {showLessonTag && <InfoTag label={lesson.title} color="#818cf8" />}
                    {currentQuestion.source && <QuestionSourceBadge source={currentQuestion.source} />}
                  </div>
                )
              })()}

              <p
                id={`mcq-question-text-${safeIndex}`}
                style={{
                  ...pulseType.cardTitle, fontSize: `calc(clamp(18px, 1.8vw, 24px) * ${fontScale})`, color: pt.textPrimary,
                  margin: '0 0 22px', lineHeight: 1.5, flexShrink: 0,
                  wordBreak: 'break-word', overflowWrap: 'anywhere'
                }}>
                {currentQuestion.question}
              </p>

              {(() => {
                const revealed = isTutorMode && !!results[currentQuestion.id]
                const result = results[currentQuestion.id]
                const struck = struckOut[safeIndex] || new Set<string>()

                return (
                  <>
                    <div role="radiogroup" aria-labelledby={`mcq-question-text-${safeIndex}`}>
                      {optionTexts(currentQuestion).map((opt: string, ai: number) => {
                        const label = optionLabels[ai]
                        const selected = answers[safeIndex] === label
                        const isStruck = struck.has(label)
                        const hoverBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.045)'

                        let bg = selected ? `${pt.cobalt}18` : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                        let border = selected ? pt.cobalt : pt.border
                        let textColor = selected ? pt.cobalt : pt.text
                        let badgeBg = selected ? pt.cobalt : 'transparent'
                        let badgeColor = selected ? '#fff' : pt.sub

                        if (revealed && result) {
                          if (label === result.correct_answer) {
                            bg = 'rgba(74,222,128,0.16)'; border = '#4ade80'; textColor = '#4ade80'
                            badgeBg = '#4ade80'; badgeColor = '#08300f'
                          } else if (label === answers[safeIndex]) {
                            bg = 'rgba(248,113,113,0.16)'; border = '#f87171'; textColor = '#f87171'
                            badgeBg = '#f87171'; badgeColor = '#3a0a0a'
                          } else {
                            textColor = pt.faint
                          }
                        }

                        const hoverBgFinal = revealed ? 'transparent' : selected ? `${pt.cobalt}20` : hoverBg

                        function handleOptionKeyDown(e: React.KeyboardEvent) {
                          if (revealed) return
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            selectAnswer(safeIndex, label)
                          }
                        }

                        return (
                          <div
                            key={ai}
                            className="exam-option"
                            role="radio"
                            aria-checked={selected}
                            aria-label={`Option ${label.toUpperCase()}: ${opt}`}
                            tabIndex={revealed ? -1 : 0}
                            onClick={() => !revealed && selectAnswer(safeIndex, label)}
                            onKeyDown={handleOptionKeyDown}
                            style={{
                              ['--opt-hover-bg' as any]: hoverBgFinal,
                              display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0, minWidth: 0,
                              background: bg, border: `1.5px solid ${border}`,
                              borderRadius: 14, padding: 'clamp(14px, 1.8vh, 20px) clamp(16px, 2vw, 24px)', marginBottom: 12,
                              cursor: revealed ? 'default' : 'pointer', opacity: isStruck && !revealed ? 0.5 : 1,
                              transition: 'opacity 0.15s ease'
                            }}>
                            <span aria-hidden style={{
                              width: 'clamp(28px, 2.2vw, 34px)', height: 'clamp(28px, 2.2vw, 34px)', borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: badgeBg,
                              border: `1.5px solid ${badgeBg === 'transparent' ? pt.border : badgeBg}`,
                              color: badgeColor, fontWeight: 800, fontSize: 'clamp(12px, 1vw, 14px)',
                              marginTop: -4
                            }}>{label.toUpperCase()}</span>
                            <span style={{
                              flex: 1, minWidth: 0, color: textColor,
                              fontSize: `calc(clamp(14px, 1.2vw, 17px) * ${fontScale})`, fontWeight: 600, lineHeight: 1.45,
                              wordBreak: 'break-word', overflowWrap: 'anywhere',
                              textDecoration: isStruck && !revealed ? 'line-through' : 'none'
                            }}>{opt}</span>
                            {!revealed && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleStrike(safeIndex, label) }}
                                aria-pressed={isStruck}
                                aria-label={`Eliminate option ${label.toUpperCase()}`}
                                className="exam-btn"
                                tabIndex={-1}
                                style={{
                                  flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
                                  background: isStruck ? (dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)') : 'transparent',
                                  border: `1px solid ${pt.border}`, color: pt.faint,
                                  fontSize: 12, fontWeight: 800, cursor: 'pointer', lineHeight: 1
                                }}>Ø</button>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {revealed && result && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: result.explanation ? 10 : 0,
                        flexShrink: 0
                      }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800, letterSpacing: 0.5, padding: '3px 10px', borderRadius: 20,
                          background: result.is_correct ? 'rgba(74,222,128,0.16)' : 'rgba(248,113,113,0.16)',
                          color: result.is_correct ? '#4ade80' : '#f87171'
                        }}>{result.is_correct ? '✓ CORRECT' : '✕ INCORRECT'}</span>
                      </div>
                    )}
                    {revealed && result?.explanation && (
                      <div style={{
                        background: dark ? 'rgba(56,189,248,0.10)' : 'rgba(2,132,199,0.06)',
                        borderRadius: 10, padding: '10px 14px', color: pt.sub, fontSize: 12,
                        flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 8
                      }}>
                        <LightbulbIcon color={pt.sub} size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ flex: 1, minWidth: 0, ...wrapText }}>{result.explanation}</span>
                      </div>
                    )}
                  </>
                )
              })()}
            </LiquidGlassCard>
          </>
        )}

        {submitted && !grading && !showReview && (
          <div style={{ paddingBottom: 20 }}>
            <div style={{ height: 1, background: EXAM_DIVIDER, marginBottom: 18 }} />

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: EXAM_LOW_SECONDARY, textShadow: EXAM_LOW_SHADOW, marginBottom: 2 }}>
                {quizMode === 'mock' ? 'MOCK EXAM COMPLETE' : quizMode === 'retry' ? 'RETRY COMPLETE' : 'PRACTICE COMPLETE'}
              </div>
              <div style={{
                fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 'clamp(52px, 11vw, 104px)',
                lineHeight: 1, color: resultColor, textShadow: '0 2px 14px rgba(1,12,74,0.55)'
              }}>{percent}</div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: resultColor, textShadow: EXAM_LOW_SHADOW, marginTop: 4 }}>
                {resultVerdict}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
                <StatChip label="CORRECT" value={score} color={pt.success} />
                <StatChip label="INCORRECT" value={total - score} color={pt.danger} />
                <StatChip label="TIME" value={formatTime(finishTimeSec)} color={EXAM_LOW_TEXT} />
              </div>
            </div>

            {subjectStats.length > 1 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: EXAM_LOW_SECONDARY, textShadow: EXAM_LOW_SHADOW, marginBottom: 10 }}>YOUR PERFORMANCE</div>
                {subjectStats.map(s => (
                  <div key={s.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: EXAM_LOW_TEXT, textShadow: EXAM_LOW_SHADOW, fontSize: 12, fontWeight: 600 }}>{s.name}</span>
                      <span style={{ color: EXAM_LOW_SECONDARY, textShadow: EXAM_LOW_SHADOW, fontSize: 12, fontWeight: 700 }}>{s.accuracy}</span>
                    </div>
                    <div style={{
                      height: 4, borderRadius: 999, overflow: 'hidden',
                      background: 'rgba(255,255,255,0.15)'
                    }}>
                      <div style={{
                        height: '100%', width: `${s.accuracy}%`, borderRadius: 999,
                        background: accuracyColor(s.accuracy, pt),
                        transition: 'width 0.6s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {weakestSubject && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: EXAM_LOW_SECONDARY, textShadow: EXAM_LOW_SHADOW, marginBottom: 8 }}>FOCUS NEXT</div>
                <LiquidGlassCard dark={dark} delay={0} style={{ padding: '16px 20px' }}>
                  <div style={{ color: MCQ_ACCENT, fontWeight: 800, fontSize: 15, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {weakestSubject.name}
                  </div>
                  <div style={{ color: pt.sub, fontSize: 12, marginBottom: 12 }}>
                    You missed {weakestSubject.incorrect} question{weakestSubject.incorrect === 1 ? '' : 's'} from this topic.
                  </div>
                  <button onClick={() => startTargetedPractice(weakestSubject.id)} className="exam-btn" style={{
                    width: '100%', background: MCQ_ACCENT, color: '#0f172a', border: 'none', borderRadius: 999,
                    padding: '11px', fontWeight: 800, fontSize: 12, letterSpacing: 0.5, cursor: 'pointer', fontFamily: pulseFonts.body
                  }}>START TARGETED PRACTICE</button>
                </LiquidGlassCard>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <button onClick={() => setShowReview(true)} className="exam-btn" style={glassPillBtn({
                width: '100%', padding: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              })}><SearchIcon2 color={EXAM_LOW_TEXT} size={14} /> REVIEW ANSWERS</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={tryAgain} className="exam-btn" style={glassPillBtn({ flex: 1, padding: '13px' })}>TRY AGAIN</button>
              <button onClick={stopQuiz} className="exam-btn" style={solidPillBtn(pt)}>DONE</button>
            </div>
          </div>
        )}

        {submitted && !grading && showReview && (
          <div style={{ paddingBottom: 20 }}>
            <div style={{ height: 1, background: EXAM_DIVIDER, marginBottom: 16 }} />

            <button onClick={() => setShowReview(false)} className="exam-btn" style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: EXAM_LOW_TEXT, textShadow: EXAM_LOW_SHADOW,
              fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 16, display: 'block'
            }}>← BACK TO RESULTS</button>

            {quizQuestions.map((q, qi) => {
              const result = results[q.id]
              const isCorrect = result?.is_correct
              const userAnswer = answers[qi]
              const isLast = qi === quizQuestions.length - 1
              const subj = subjects.find(s => s.id === q.subject_id)
              const lesson = lessons.find(l => l.id === q.lesson_id)
              const showSubjectTag = quizMode === 'mock' && !!subj
              const showLessonTag = !lessonFilter && !!lesson
              return (
                <div key={qi} style={{ marginBottom: isLast ? 0 : 14 }}>
                  <LiquidGlassCard dark={dark} delay={0} style={{
                    padding: '18px 20px', width: '100%', boxSizing: 'border-box',
                    boxShadow: `inset 0 0 0 2px ${isCorrect ? '#4ade80' : userAnswer ? '#f87171' : 'transparent'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 28, height: 22, padding: '0 8px', borderRadius: 7,
                        background: `${MCQ_ACCENT}22`, border: `1px solid ${MCQ_ACCENT}55`,
                        color: MCQ_ACCENT, fontWeight: 800, fontSize: 11
                      }}>Q{qi + 1}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 800, letterSpacing: 0.5, padding: '2px 9px', borderRadius: 20,
                        background: isCorrect ? 'rgba(74,222,128,0.16)' : 'rgba(248,113,113,0.16)',
                        color: isCorrect ? '#4ade80' : '#f87171'
                      }}>{isCorrect ? '✓ CORRECT' : userAnswer ? '✕ INCORRECT' : '— UNANSWERED'}</span>
                      {showSubjectTag && <InfoTag label={subj.name} color={subj.color || '#34d399'} />}
                      {showLessonTag && <InfoTag label={lesson.title} color="#818cf8" />}
                      {q.source && <QuestionSourceBadge source={q.source} />}
                    </div>

                    <p style={{
                      ...pulseType.cardTitle, color: pt.textPrimary, margin: '0 0 12px',
                      ...wrapText
                    }}>{q.question}</p>

                    {optionTexts(q).map((opt: string, ai: number) => {
                      const label = optionLabels[ai]
                      let bg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
                      let border = pt.border
                      let color = pt.sub
                      if (result && label === result.correct_answer) { bg = 'rgba(74,222,128,0.16)'; border = '#4ade80'; color = '#4ade80' }
                      if (result && userAnswer === label && label !== result.correct_answer) { bg = 'rgba(248,113,113,0.16)'; border = '#f87171'; color = '#f87171' }
                      return (
                        <div key={ai} style={{
                          background: bg, border: `1px solid ${border}`,
                          borderRadius: 10, padding: '10px 14px', marginBottom: 8,
                          color, fontSize: 13, fontWeight: 600,
                          ...wrapText
                        }}>
                          {label.toUpperCase()}. {opt}
                        </div>
                      )
                    })}

                    {result?.explanation && (
                      <div style={{
                        background: dark ? 'rgba(56,189,248,0.10)' : 'rgba(2,132,199,0.06)',
                        borderRadius: 10, padding: '10px 14px', marginTop: 8, color: pt.sub, fontSize: 12,
                        display: 'flex', alignItems: 'flex-start', gap: 8
                      }}>
                        <LightbulbIcon color={pt.sub} size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ flex: 1, minWidth: 0, ...wrapText }}>{result.explanation}</span>
                      </div>
                    )}
                  </LiquidGlassCard>
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowReview(false)} className="exam-btn" style={glassPillBtn({ flex: 1, padding: '13px' })}>← BACK</button>
              <button onClick={stopQuiz} className="exam-btn" style={solidPillBtn(pt)}>DONE</button>
            </div>
          </div>
        )}
      </motion.div>

      {barVisible && createPortal(
        <div
          ref={barRef}
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: BAR_Z_INDEX,
            display: 'flex', justifyContent: 'center', pointerEvents: 'none',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
            fontFamily: pulseFonts.body,
          }}
        >
          <div style={{
            width: 'min(1080px, 92vw)', boxSizing: 'border-box',
            padding: '0 clamp(16px, 3vw, 36px)', pointerEvents: 'auto',
          }}>
            <PulseGlassRow
              dark={dark} radius={24} active activeTint={BAR_TINT}
              role="toolbar" aria-label="Question navigation"
            >
              <div style={{ padding: '8px 10px' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                  alignItems: 'center', gap: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      onClick={goPrev}
                      disabled={safeIndex === 0}
                      className={`exam-btn exam-bar-nav glass-focus-ring${isLastQuestion ? ' exam-bar-wide' : ''}`}
                      aria-label="Previous question"
                      title="Previous (←)"
                      style={{
                        ...barBtnBase,
                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.28)',
                        color: EXAM_LOW_TEXT,
                        opacity: safeIndex === 0 ? 0.4 : 1,
                        cursor: safeIndex === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <ChevronLeft size={18} aria-hidden />
                      <span className="exam-bar-label">Previous</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <button
                      onClick={() => toggleFlagFor(currentQuestion)}
                      className="exam-btn exam-bar-flag glass-focus-ring"
                      aria-pressed={currentFlagged}
                      aria-label={currentFlagged ? 'Remove flag from this question' : 'Flag this question'}
                      title="Flag (F)"
                      style={{
                        ...barBtnBase,
                        background: currentFlagged ? `${pt.amber}26` : 'transparent',
                        border: `1px solid ${currentFlagged ? `${pt.amber}80` : 'rgba(255,255,255,0.22)'}`,
                        color: currentFlagged ? pt.amber : EXAM_LOW_SECONDARY,
                      }}
                    >
                      <FlagIcon color={currentFlagged ? pt.amber : EXAM_LOW_SECONDARY} size={15} />
                      <span className="exam-bar-label">{currentFlagged ? 'Flagged' : 'Flag'}</span>
                    </button>
                    <span
                      aria-label={`${answeredCount} of ${total} answered`}
                      style={{
                        color: EXAM_LOW_SECONDARY, fontSize: 12, fontWeight: 700,
                        whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                      }}
                    >{answeredCount}/{total}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {!isLastQuestion ? (
                      <button
                        onClick={goNext}
                        className="exam-btn exam-bar-nav glass-focus-ring"
                        aria-label="Next question"
                        title="Next (→)"
                        style={{
                          ...barBtnBase,
                          background: MCQ_ACCENT, border: `1px solid ${MCQ_ACCENT}`, color: '#0f172a',
                          boxShadow: `0 6px 20px ${MCQ_ACCENT}40`,
                        }}
                      >
                        <span className="exam-bar-label">Next</span>
                        <ChevronRight size={18} aria-hidden />
                      </button>
                    ) : (
                      <button
                        onClick={() => { if (remainingUnanswered > 0) { setConfirmSubmitOpen(true); return } submitQuiz() }}
                        className="exam-btn exam-bar-nav exam-bar-wide glass-focus-ring"
                        aria-label="Submit exam"
                        style={{
                          ...barBtnBase,
                          background: MCQ_ACCENT, border: `1px solid ${MCQ_ACCENT}`, color: '#0f172a',
                          boxShadow: `0 6px 20px ${MCQ_ACCENT}40`,
                        }}
                      >
                        <span>Submit</span>
                        <Check size={18} aria-hidden />
                      </button>
                    )}
                  </div>
                </div>

                <div className="kbd-hint" style={{
                  textAlign: 'center', color: EXAM_LOW_TEXT_MUTED,
                  fontSize: 10, fontWeight: 600, letterSpacing: 0.3, marginTop: 4,
                }}>← → navigate · 1–4 select · F flag</div>
              </div>
            </PulseGlassRow>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        dark={dark}
        open={confirmExitOpen}
        title="Leave this exam?"
        message={quizMode === 'retry' ? "Your answers in this retry won't be saved." : 'You can continue it later from the MCQ page.'}
        confirmLabel="Leave"
        cancelLabel="Keep going"
        confirmColor={pt.danger}
        onCancel={() => setConfirmExitOpen(false)}
        onConfirm={() => { setConfirmExitOpen(false); stopQuiz() }}
      />

      <ConfirmDialog
        dark={dark}
        open={confirmSubmitOpen}
        title="Submit exam?"
        message={`${remainingUnanswered} question${remainingUnanswered === 1 ? '' : 's'} left unanswered — submit the exam anyway?`}
        confirmLabel="Submit"
        confirmColor={pt.cobalt}
        onCancel={() => setConfirmSubmitOpen(false)}
        onConfirm={() => { setConfirmSubmitOpen(false); submitQuiz() }}
      />
    </div>
  )
}
