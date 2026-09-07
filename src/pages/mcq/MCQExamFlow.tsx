// src/pages/mcq/MCQExamFlow.tsx
// Taking + Results + Review Answers — everything that renders while
// quizMode is set. Pulled out of MCQ.tsx unchanged in behavior; all
// derived values (score, subjectStats, timerColor, etc.) are computed
// here from props instead of being passed down pre-computed.
import { motion } from 'framer-motion'
import { getPulseTheme, pulseFonts, pulseType } from '../../premiumTheme'
import QuestionRail from '../../components/QuestionRail'
import QuestionSourceBadge from '../../components/QuestionSourceBadge'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../../components/pulse/PulseBackground'
import { FlagIcon, SearchIcon2, LightbulbIcon } from '../../components/ui/tool-icons'
import {
  MOCK_MINUTES, MCQ_ACCENT,
  EXAM_TOP_TEXT, EXAM_TOP_TEXT_MUTED, EXAM_TOP_AMBER, EXAM_TOP_RED,
  EXAM_LOW_TEXT, EXAM_LOW_SECONDARY, EXAM_LOW_TEXT_MUTED, EXAM_LOW_SHADOW, EXAM_DIVIDER,
  optionLabels, optionTexts, formatTime, StatChip, InfoTag,
  accuracyTier, accuracyColor
} from './mcqShared'

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
  timeLeft: number
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

// Shared wrap rules for the question/answer/explanation blocks below —
// same pattern already used on Review.tsx — so long unbroken tokens
// (drug names, dosages, abbreviations with no spaces) can always break
// onto a new line instead of forcing the box wider than its card and
// getting clipped by the card's own overflow boundary.
const wrapText: React.CSSProperties = { wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal' }

export default function MCQExamFlow({
  dark, quizMode, submitted, grading, quizQuestions, answers, results,
  flaggedIds, struckOut, currentIndex, setCurrentIndex,
  timeLeft, elapsedSeconds, finishTimeSec, fontScale, cycleFontScale,
  showReview, setShowReview, subjects, lessons, lessonFilter,
  stopQuiz, submitQuiz, tryAgain, startTargetedPractice,
  selectAnswer, toggleStrike, toggleFlagFor, goPrev, goNext
}: MCQExamFlowProps) {
  const pt = getPulseTheme(dark)
  const isTutorMode = quizMode === 'practice' || quizMode === 'retry'

  function getScore() {
    return quizQuestions.filter(q => results[q.id]?.is_correct).length
  }

  // Gradual urgency for the mock-exam countdown — normal (dark navy,
  // since the timer sits in the light top zone), then a deepened amber
  // under ~28% remaining (~10 min of 36), then a deepened red under
  // ~14% (~5 min). No sudden full-screen warning, just a color shift.
  function timerColor() {
    if (quizMode !== 'mock') return EXAM_TOP_TEXT
    const pctLeft = timeLeft / (MOCK_MINUTES * 60)
    if (pctLeft <= 0.14) return EXAM_TOP_RED
    if (pctLeft <= 0.28) return EXAM_TOP_AMBER
    return EXAM_TOP_TEXT
  }

  const score = submitted ? getScore() : 0
  const total = quizQuestions.length
  const percent = total > 0 ? Math.round((score / total) * 100) : 0

  // Color and verdict for the big results number — shared tiers with
  // the Home page's Weekly Report card and the weekly push
  // notification (see accuracyTier/accuracyColor in mcqShared.tsx), so
  // a change to the breakpoints in one place updates everywhere.
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

  // Real per-subject breakdown from this session's own results — no
  // invented numbers. Only subjects actually present among the
  // graded questions are included.
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
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <style>{`
        .exam-option { transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease; }
        .exam-option:hover { background: var(--opt-hover-bg); }
        .exam-option:active { transform: scale(0.985); }
        .exam-option:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }
        .exam-btn { transition: opacity 0.15s ease, transform 0.12s ease; }
        .exam-btn:active { transform: scale(0.97); }
        .kbd-hint { display: none; }
        @media (hover: hover) and (pointer: fine) { .kbd-hint { display: block; } }
      `}</style>

      {/* Short entrance — a quick fade/slide, not a takeover. The
          real site header (rendered above this by App.jsx) stays
          exactly where it is; exam mode is just this page's content.
          No BackButton in exam mode — the ✕ EXIT control in the
          status header below is the intended way out of a quiz. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative', zIndex: 1,
          maxWidth: 'min(1080px, 92vw)', margin: '0 auto',
          padding: '12px clamp(16px, 3vw, 36px) max(16px, env(safe-area-inset-bottom))', fontFamily: pulseFonts.body
        }}
      >
        {/* Minimal status header — sits in the gradient's light top zone */}
        <div style={{ position: 'relative', textAlign: 'center', paddingBottom: 14 }}>
          <button onClick={stopQuiz} className="exam-btn" aria-label="Exit exam" style={{
            position: 'absolute', top: 0, right: 0,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: EXAM_TOP_TEXT_MUTED, fontSize: 11, fontWeight: 700, letterSpacing: 1
          }}>✕ EXIT</button>

          {!submitted && !grading && (
            <button
              onClick={cycleFontScale}
              className="exam-btn"
              aria-label={`Adjust text size (currently ${Math.round(fontScale * 100)}%)`}
              style={{
                position: 'absolute', top: 0, left: 0,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: EXAM_TOP_TEXT_MUTED, fontSize: 13, fontWeight: 800, letterSpacing: 0.5
              }}>Aa</button>
          )}

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: EXAM_TOP_TEXT_MUTED }}>ZNU · EXAM MODE</div>

          {!submitted && !grading && total > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: EXAM_TOP_TEXT, marginTop: 8 }}>
                QUESTION {safeIndex + 1} / {total}
              </div>
              <div style={{
                fontFamily: 'monospace', fontWeight: 800, fontSize: 24, marginTop: 8,
                color: timerColor(), transition: 'color 0.5s ease'
              }}>
                {quizMode === 'mock' ? formatTime(timeLeft) : formatTime(elapsedSeconds)}
              </div>

              {quizMode === 'mock' && (
                <div style={{ width: '100%', maxWidth: 220, margin: '10px auto 0', height: 4, borderRadius: 999, background: 'rgba(10,31,61,0.12)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 999,
                    width: `${(timeLeft / (MOCK_MINUTES * 60)) * 100}%`,
                    background: timerColor(), transition: 'width 1s linear, background 0.5s ease'
                  }} />
                </div>
              )}
            </>
          )}
          {grading && (
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: EXAM_TOP_TEXT, marginTop: 8 }}>GRADING…</div>
          )}
          {submitted && (
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: EXAM_TOP_TEXT, marginTop: 8 }}>RESULTS</div>
          )}
        </div>

        {total === 0 && !submitted && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <h2 style={{ color: MCQ_ACCENT, fontSize: 16 }}>No questions available yet!</h2>
          </div>
        )}

        {grading && (
          <div style={{ textAlign: 'center', padding: 24, color: EXAM_LOW_TEXT, textShadow: EXAM_LOW_SHADOW, fontSize: 14 }}>Grading...</div>
        )}

        {/* ── Active taking: single-question focus */}
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

            <div style={{ height: 1, background: EXAM_DIVIDER, marginBottom: 12 }} />

            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <button onClick={() => toggleFlagFor(currentQuestion)} className="exam-btn" style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: flaggedIds.has(currentQuestion.id) ? pt.amber : EXAM_LOW_TEXT_MUTED,
                textShadow: EXAM_LOW_SHADOW,
                fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
                display: 'inline-flex', alignItems: 'center', gap: 6
              }}>
                <FlagIcon color={flaggedIds.has(currentQuestion.id) ? pt.amber : EXAM_LOW_TEXT_MUTED} size={13} />
                {flaggedIds.has(currentQuestion.id) ? 'FLAGGED' : 'FLAG'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 }}>
              <button onClick={goPrev} disabled={safeIndex === 0} className="exam-btn" style={{
                background: 'transparent', border: 'none', cursor: safeIndex === 0 ? 'not-allowed' : 'pointer',
                color: safeIndex === 0 ? 'rgba(245,250,255,0.35)' : EXAM_LOW_TEXT,
                textShadow: EXAM_LOW_SHADOW, fontSize: 13, fontWeight: 700, letterSpacing: 1.5
              }}>PREVIOUS</button>

              <span style={{ color: EXAM_LOW_SECONDARY, textShadow: EXAM_LOW_SHADOW, fontSize: 11, fontWeight: 700 }}>{answeredCount}/{total}</span>

              {!isLastQuestion ? (
                <button onClick={goNext} className="exam-btn" style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: pt.cobalt, textShadow: EXAM_LOW_SHADOW, fontSize: 13, fontWeight: 700, letterSpacing: 1.5
                }}>NEXT</button>
              ) : (
                <button
                  onClick={() => {
                    const remaining = total - answeredCount
                    if (remaining > 0) {
                      const proceed = window.confirm(
                        `${remaining} question${remaining === 1 ? '' : 's'} left unanswered — submit the exam anyway?`
                      )
                      if (!proceed) return
                    }
                    submitQuiz()
                  }}
                  className="exam-btn"
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: pt.cobalt, textShadow: EXAM_LOW_SHADOW, fontSize: 13, fontWeight: 800, letterSpacing: 1.5
                  }}>SUBMIT</button>
              )}
            </div>

            <div className="kbd-hint" style={{
              textAlign: 'center', color: EXAM_LOW_TEXT_MUTED, textShadow: EXAM_LOW_SHADOW,
              fontSize: 10, fontWeight: 600, letterSpacing: 0.3, paddingBottom: 4
            }}>← → navigate · 1–4 select · F flag</div>
          </>
        )}

        {/* ── Results: analytical instrument ─────────────────────── */}
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
              <button onClick={() => setShowReview(true)} className="exam-btn" style={{
                width: '100%', background: 'rgba(1,12,74,0.28)',
                border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '12px',
                color: EXAM_LOW_TEXT, textShadow: EXAM_LOW_SHADOW,
                cursor: 'pointer', fontWeight: 700, fontSize: 13, letterSpacing: 0.5, fontFamily: pulseFonts.body,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}><SearchIcon2 color={EXAM_LOW_TEXT} size={14} /> REVIEW ANSWERS</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={tryAgain} className="exam-btn" style={{
                flex: 1, background: 'rgba(1,12,74,0.28)',
                border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '13px',
                color: EXAM_LOW_TEXT, textShadow: EXAM_LOW_SHADOW,
                cursor: 'pointer', fontWeight: 700, fontSize: 13, letterSpacing: 0.5, fontFamily: pulseFonts.body
              }}>TRY AGAIN</button>
              <button onClick={stopQuiz} className="exam-btn" style={{
                flex: 1, background: pt.cobalt, border: 'none', borderRadius: 999, padding: '13px',
                color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, letterSpacing: 0.5, fontFamily: pulseFonts.body
              }}>DONE</button>
            </div>
          </div>
        )}

        {/* ── Review Answers: full scrollable per-question breakdown ── */}
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
                  {/* AUDIT FIX: this card, like every LiquidGlassCard,
                      now sizes itself to whatever content is actually
                      inside it (see liquid-glass-card.tsx) instead of
                      being locked to a fixed height and clipping the
                      rest. `width: '100%'` and `boxSizing: 'border-box'`
                      are added defensively so a very wide unbroken
                      token in an option/explanation can't force this
                      card wider than its column either. */}
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
              <button onClick={() => setShowReview(false)} className="exam-btn" style={{
                flex: 1, background: 'rgba(1,12,74,0.28)',
                border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '13px',
                color: EXAM_LOW_TEXT, textShadow: EXAM_LOW_SHADOW,
                cursor: 'pointer', fontWeight: 700, fontSize: 13, letterSpacing: 0.5, fontFamily: pulseFonts.body
              }}>← BACK</button>
              <button onClick={stopQuiz} className="exam-btn" style={{
                flex: 1, background: pt.cobalt, border: 'none', borderRadius: 999, padding: '13px',
                color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, letterSpacing: 0.5, fontFamily: pulseFonts.body
              }}>DONE</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
