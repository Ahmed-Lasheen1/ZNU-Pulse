import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { getPulseTheme, pulseFonts, pulseType, ON_BACKGROUND } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import StudyShell from '@/shared/ui/study/StudyShell'
import StudyHeader from '@/shared/ui/study/StudyHeader'
import StudyCard, { STUDY_CARD_TALL } from '@/shared/ui/study/StudyCard'
import ProgressRail from '@/shared/ui/study/ProgressRail'
import StudyActionBar, { BAR_BUTTON_BASE, BAR_TEXT, BAR_TEXT_MUTED } from '@/shared/ui/study/StudyActionBar'
import QuestionSourceBadge from '@/shared/ui/display/QuestionSourceBadge'
import AutoDirText from '@/shared/ui/display/AutoDirText'
import Badge from '@/shared/ui/display/Badge'
import Button from '@/shared/ui/controls/Button'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import { GradingSkeleton } from '@/shared/ui/feedback/Skeletons'
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog'
import { FlagIcon, SearchIcon2 } from '@/shared/icons/tool-icons'
import { wrapText } from '@/shared/utils/textStyles'
import {
  optionLabels, optionTexts, formatTime,
  StatChip, ReviewOption, ExplanationNote,
} from '@/features/practice/mcqShared'
import { MCQ_ACCENT } from '@/shared/theme/accents'
import { ON_ACCENT } from '@/shared/theme/tokens'
import { accuracyTier, accuracyColor } from '@/shared/utils/accuracy'

interface MCQExamFlowProps {
  dark: boolean
  quizMode: string
  quizTitle: string
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

// Exam screen: question flow, results summary and answer review for every MCQ mode.
export default function MCQExamFlow({
  dark, quizMode, quizTitle, submitted, grading, quizQuestions, answers, results,
  flaggedIds, struckOut, currentIndex, setCurrentIndex,
  elapsedSeconds, finishTimeSec, fontScale, cycleFontScale,
  showReview, setShowReview, subjects, lessons, lessonFilter,
  stopQuiz, submitQuiz, tryAgain, startTargetedPractice,
  selectAnswer, toggleStrike, toggleFlagFor, goPrev, goNext
}: MCQExamFlowProps) {
  const pt = getPulseTheme(dark)
  const isTutorMode = quizMode === 'practice' || quizMode === 'retry'
  const showsSubjectTags = quizMode === 'mock' || quizMode === 'simulator'
  const completeLabel = `${quizTitle.toUpperCase()} COMPLETE`
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)
  const [barHeight, setBarHeight] = useState(96)

  // Status colors and their 16% tints come from the theme.
  const okColor = pt.success
  const badColor = pt.danger
  const okTint = pt.successTint
  const badTint = pt.dangerTint
  // Letter color on a solid correct/incorrect badge.
  const onOk = dark ? '#08300f' : '#FFFFFF'
  const onBad = dark ? '#3a0a0a' : '#FFFFFF'
  // The accent as text color (the original stays for fills).
  const accentText = adaptColor(MCQ_ACCENT, dark)
  // The action bar is dark in both modes, so its flag button uses the dark theme's amber.
  const barAmber = getPulseTheme(true).amber

  // Counts the questions answered correctly.
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

  const currentSubject = currentQuestion ? subjects.find(s => s.id === currentQuestion.subject_id) : null
  const currentLesson = currentQuestion ? lessons.find(l => l.id === currentQuestion.lesson_id) : null
  const showCurrentSubjectTag = showsSubjectTags && !!currentSubject
  const showCurrentLessonTag = !lessonFilter && !!currentLesson

  // Asks for confirmation before leaving an exam with answers; otherwise leaves right away.
  function requestExit() {
    if (!submitted && answeredCount > 0) setConfirmExitOpen(true)
    else stopQuiz()
  }

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

  const headerStatus = grading
    ? 'GRADING…'
    : submitted
      ? 'RESULTS'
      : total > 0 ? `QUESTION ${safeIndex + 1} / ${total}` : undefined
  const inQuiz = !submitted && !grading

  return (
    <StudyShell
      bottomPadding={barVisible ? barHeight + 16 : 16}
      overlays={
        <>
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
        </>
      }
    >
      <style>{`
        .exam-option { transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease; }
        .exam-option:hover { background: var(--opt-hover-bg); }
        .exam-option:active { transform: scale(0.985); }
        .exam-option:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }
        .exam-bar-label { display: inline; }
        .exam-bar-nav { width: 124px; }
        .exam-bar-flag { width: 112px; }
        @media (max-width: 460px) {
          .exam-bar-label { display: none; }
          .exam-bar-nav, .exam-bar-flag { width: 46px; }
          .exam-bar-nav.exam-bar-wide { width: 96px; }
        }
      `}</style>

      <StudyHeader
        dark={dark}
        eyebrow={quizTitle.toUpperCase()}
        status={headerStatus}
        timer={inQuiz && total > 0 ? formatTime(elapsedSeconds) : undefined}
        fontScale={fontScale}
        onCycleFontScale={inQuiz ? cycleFontScale : undefined}
        onExit={requestExit}
      />

      {total === 0 && !submitted && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h2 style={{ color: accentText, fontSize: 16 }}>No questions available yet!</h2>
        </div>
      )}

      {grading && <GradingSkeleton />}

      {!submitted && !grading && currentQuestion && (
        <>
          <div style={{ height: 1, background: ON_BACKGROUND.divider, marginBottom: 16 }} />

          <ProgressRail
            total={total}
            currentIndex={safeIndex}
            doneIndexes={answeredIndexes}
            flaggedIndexes={flaggedIndexes}
            onGoTo={setCurrentIndex}
            dark={dark}
            accent={MCQ_ACCENT}
          />

          <StudyCard
            dark={dark}
            minHeight={STUDY_CARD_TALL}
            accent={MCQ_ACCENT}
            style={{ overflowY: 'auto', overflowX: 'hidden' }}
            header={
              <>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 30, height: 24, padding: '0 9px', borderRadius: 8,
                  background: `${MCQ_ACCENT}22`, border: `1px solid ${MCQ_ACCENT}55`,
                  color: accentText, fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap'
                }}>Q{safeIndex + 1}</span>
                {showCurrentSubjectTag && (
                  <Badge variant="neutral" dark={dark} color={currentSubject.color || '#34d399'} dot={currentSubject.color || '#34d399'}>{currentSubject.name}</Badge>
                )}
                {showCurrentLessonTag && <Badge variant="neutral" dark={dark} color="#818cf8" dot="#818cf8">{currentLesson.title}</Badge>}
                {currentQuestion.source && <QuestionSourceBadge source={currentQuestion.source} dark={dark} />}
              </>
            }
          >
            <div id={`mcq-question-text-${safeIndex}`} style={{ margin: '0 0 22px', flexShrink: 0 }}>
              <AutoDirText
                text={currentQuestion.question}
                style={{
                  ...pulseType.cardTitle, fontSize: `calc(clamp(18px, 1.8vw, 24px) * ${fontScale})`, color: pt.textPrimary,
                  lineHeight: 1.5, ...wrapText
                }}
              />
            </div>

            {(() => {
              const revealed = isTutorMode && !!results[currentQuestion.id]
              const result = results[currentQuestion.id]
              const struck = struckOut[safeIndex] || new Set<string>()

              return (
                <>
                  {/* Keyed by question so a focused option never carries its focus ring to the next question. */}
                  <div key={safeIndex} role="radiogroup" aria-labelledby={`mcq-question-text-${safeIndex}`}>
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
                          bg = okTint; border = okColor; textColor = okColor
                          badgeBg = okColor; badgeColor = onOk
                        } else if (label === answers[safeIndex]) {
                          bg = badTint; border = badColor; textColor = badColor
                          badgeBg = badColor; badgeColor = onBad
                        } else {
                          textColor = pt.faint
                        }
                      }

                      const hoverBgFinal = revealed ? 'transparent' : selected ? `${pt.cobalt}20` : hoverBg

                      // Selects the option on Enter or Space unless the answer is already revealed.
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
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <AutoDirText
                              text={opt}
                              style={{
                                color: textColor,
                                fontSize: `calc(clamp(14px, 1.2vw, 17px) * ${fontScale})`, fontWeight: 600, lineHeight: 1.45,
                                textDecoration: isStruck && !revealed ? 'line-through' : 'none',
                                ...wrapText
                              }}
                            />
                          </span>
                          {!revealed && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleStrike(safeIndex, label) }}
                              aria-pressed={isStruck}
                              aria-label={`Eliminate option ${label.toUpperCase()}`}
                              className="study-btn"
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
                      <Badge color={result.is_correct ? okColor : badColor}>
                        {result.is_correct ? '✓ CORRECT' : '✕ INCORRECT'}
                      </Badge>
                    </div>
                  )}
                  {revealed && result?.explanation && (
                    <ExplanationNote dark={dark} style={{ flexShrink: 0 }}>{result.explanation}</ExplanationNote>
                  )}
                </>
              )
            })()}
          </StudyCard>
        </>
      )}

      {submitted && !grading && !showReview && (
        <div style={{ paddingBottom: 20 }}>
          <div style={{ height: 1, background: ON_BACKGROUND.divider, marginBottom: 18 }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: ON_BACKGROUND.secondary, marginBottom: 2 }}>
              {completeLabel}
            </div>
            <div style={{
              fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 'clamp(52px, 11vw, 104px)',
              lineHeight: 1, color: resultColor
            }}>{percent}</div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: resultColor, marginTop: 4 }}>
              {resultVerdict}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
              <StatChip label="CORRECT" value={score} color={pt.success} />
              <StatChip label="INCORRECT" value={total - score} color={pt.danger} />
              <StatChip label="TIME" value={formatTime(finishTimeSec)} color={ON_BACKGROUND.primary} />
            </div>
          </div>

          {subjectStats.length > 1 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: ON_BACKGROUND.secondary, marginBottom: 10 }}>YOUR PERFORMANCE</div>
              {subjectStats.map(s => (
                <div key={s.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: ON_BACKGROUND.primary, fontSize: 12, fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: ON_BACKGROUND.secondary, fontSize: 12, fontWeight: 700 }}>{s.accuracy}</span>
                  </div>
                  <div style={{
                    height: 4, borderRadius: 999, overflow: 'hidden',
                    background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(6,43,80,0.15)'
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
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: ON_BACKGROUND.secondary, marginBottom: 8 }}>FOCUS NEXT</div>
              <LiquidGlassCard dark={dark} delay={0} style={{ padding: '16px 20px' }}>
                <div style={{ color: accentText, fontWeight: 800, fontSize: 15, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {weakestSubject.name}
                </div>
                <div style={{ color: pt.sub, fontSize: 12, marginBottom: 12 }}>
                  You missed {weakestSubject.incorrect} question{weakestSubject.incorrect === 1 ? '' : 's'} from this topic.
                </div>
                <Button
                  dark={dark} variant="solid" size="md" color={MCQ_ACCENT} fullWidth
                  onClick={() => startTargetedPractice(weakestSubject.id)}
                  style={{ padding: 11, fontSize: 12, letterSpacing: 0.5 }}
                >START TARGETED PRACTICE</Button>
              </LiquidGlassCard>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <Button
              dark={dark} variant="glass" size="field" fullWidth color={ON_BACKGROUND.primary}
              onClick={() => setShowReview(true)} style={{ padding: 12, letterSpacing: 0.5, gap: 8 }}
            ><SearchIcon2 color={ON_BACKGROUND.primary} size={14} /> REVIEW ANSWERS</Button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <Button dark={dark} variant="glass" size="field" color={ON_BACKGROUND.primary} onClick={tryAgain} style={{ flex: 1, padding: 13, letterSpacing: 0.5 }}>TRY AGAIN</Button>
            <Button dark={dark} variant="solid" size="field" color={pt.cobalt} onColor="#fff" onClick={stopQuiz} style={{ flex: 1, padding: 13, letterSpacing: 0.5 }}>DONE</Button>
          </div>
        </div>
      )}

      {submitted && !grading && showReview && (
        <div style={{ paddingBottom: 20 }}>
          <div style={{ height: 1, background: ON_BACKGROUND.divider, marginBottom: 16 }} />

          <button onClick={() => setShowReview(false)} className="study-btn" style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: ON_BACKGROUND.primary,
            fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 16, display: 'block'
          }}>← BACK TO RESULTS</button>

          {quizQuestions.map((q, qi) => {
            const result = results[q.id]
            const isCorrect = result?.is_correct
            const userAnswer = answers[qi]
            const isLast = qi === quizQuestions.length - 1
            const subj = subjects.find(s => s.id === q.subject_id)
            const lesson = lessons.find(l => l.id === q.lesson_id)
            const showSubjectTag = showsSubjectTags && !!subj
            const showLessonTag = !lessonFilter && !!lesson
            return (
              <div key={qi} style={{ marginBottom: isLast ? 0 : 14 }}>
                <LiquidGlassCard dark={dark} delay={0} style={{
                  padding: '18px 20px', width: '100%', boxSizing: 'border-box',
                  boxShadow: `inset 0 0 0 2px ${isCorrect ? okColor : userAnswer ? badColor : 'transparent'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 28, height: 22, padding: '0 8px', borderRadius: 7,
                      background: `${MCQ_ACCENT}22`, border: `1px solid ${MCQ_ACCENT}55`,
                      color: accentText, fontWeight: 800, fontSize: 11
                    }}>Q{qi + 1}</span>
                    <Badge color={isCorrect ? okColor : badColor} size="sm">
                      {isCorrect ? '✓ CORRECT' : userAnswer ? '✕ INCORRECT' : '— UNANSWERED'}
                    </Badge>
                    {showSubjectTag && <Badge variant="neutral" dark={dark} color={subj.color || '#34d399'} dot={subj.color || '#34d399'}>{subj.name}</Badge>}
                    {showLessonTag && <Badge variant="neutral" dark={dark} color="#818cf8" dot="#818cf8">{lesson.title}</Badge>}
                    {q.source && <QuestionSourceBadge source={q.source} dark={dark} />}
                  </div>

                  <div style={{ margin: '0 0 12px' }}>
                    <AutoDirText text={q.question} style={{ ...pulseType.cardTitle, color: pt.textPrimary, ...wrapText }} />
                  </div>

                  {optionTexts(q).map((opt: string, ai: number) => {
                    const label = optionLabels[ai]
                    const state = result && label === result.correct_answer
                      ? 'correct'
                      : result && userAnswer === label ? 'wrong' : 'neutral'
                    return <ReviewOption key={ai} dark={dark} label={label} text={opt} state={state} />
                  })}

                  {result?.explanation && (
                    <ExplanationNote dark={dark} style={{ marginTop: 8 }}>{result.explanation}</ExplanationNote>
                  )}
                </LiquidGlassCard>
              </div>
            )
          })}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Button dark={dark} variant="glass" size="field" color={ON_BACKGROUND.primary} onClick={() => setShowReview(false)} style={{ flex: 1, padding: 13, letterSpacing: 0.5 }}>← BACK</Button>
            <Button dark={dark} variant="solid" size="field" color={pt.cobalt} onColor="#fff" onClick={stopQuiz} style={{ flex: 1, padding: 13, letterSpacing: 0.5 }}>DONE</Button>
          </div>
        </div>
      )}

      {barVisible && (
        <StudyActionBar
          dark={dark}
          ariaLabel="Question navigation"
          onHeightChange={setBarHeight}
          hint="← → navigate · 1–4 / A–D select · Enter next · F flag"
        >
          <div style={{
            display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            alignItems: 'center', gap: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                onClick={goPrev}
                disabled={safeIndex === 0}
                className={`study-btn exam-bar-nav glass-focus-ring${isLastQuestion ? ' exam-bar-wide' : ''}`}
                aria-label="Previous question"
                title="Previous (←)"
                style={{
                  ...BAR_BUTTON_BASE,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.28)',
                  color: BAR_TEXT,
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
                className="study-btn exam-bar-flag glass-focus-ring"
                aria-pressed={currentFlagged}
                aria-label={currentFlagged ? 'Remove flag from this question' : 'Flag this question'}
                title="Flag (F)"
                style={{
                  ...BAR_BUTTON_BASE,
                  background: currentFlagged ? `${barAmber}26` : 'transparent',
                  border: `1px solid ${currentFlagged ? `${barAmber}80` : 'rgba(255,255,255,0.22)'}`,
                  color: currentFlagged ? barAmber : BAR_TEXT_MUTED,
                }}
              >
                <FlagIcon color={currentFlagged ? barAmber : BAR_TEXT_MUTED} size={15} />
                <span className="exam-bar-label">{currentFlagged ? 'Flagged' : 'Flag'}</span>
              </button>
              <span
                aria-label={`${answeredCount} of ${total} answered`}
                style={{
                  color: BAR_TEXT_MUTED, fontSize: 12, fontWeight: 700,
                  whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                }}
              >{answeredCount}/{total}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {!isLastQuestion ? (
                <button
                  onClick={goNext}
                  className="study-btn exam-bar-nav glass-focus-ring"
                  aria-label="Next question"
                  title="Next (→)"
                  style={{
                    ...BAR_BUTTON_BASE,
                    background: MCQ_ACCENT, border: `1px solid ${MCQ_ACCENT}`, color: ON_ACCENT,
                    boxShadow: `0 6px 20px ${MCQ_ACCENT}40`,
                  }}
                >
                  <span className="exam-bar-label">Next</span>
                  <ChevronRight size={18} aria-hidden />
                </button>
              ) : (
                <button
                  onClick={() => { if (remainingUnanswered > 0) { setConfirmSubmitOpen(true); return } submitQuiz() }}
                  className="study-btn exam-bar-nav exam-bar-wide glass-focus-ring"
                  aria-label="Submit exam"
                  style={{
                    ...BAR_BUTTON_BASE,
                    background: MCQ_ACCENT, border: `1px solid ${MCQ_ACCENT}`, color: ON_ACCENT,
                    boxShadow: `0 6px 20px ${MCQ_ACCENT}40`,
                  }}
                >
                  <span>Submit</span>
                  <Check size={18} aria-hidden />
                </button>
              )}
            </div>
          </div>
        </StudyActionBar>
      )}
    </StudyShell>
  )
}
