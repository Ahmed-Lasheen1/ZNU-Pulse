import { useState, useEffect, useRef } from 'react'
import { useAnimate, motion } from 'framer-motion'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '@/shared/theme/premiumTheme'
import StudyShell from '@/shared/ui/study/StudyShell'
import StudyHeader from '@/shared/ui/study/StudyHeader'
import StudyCard, { STUDY_CARD_HEIGHT } from '@/shared/ui/study/StudyCard'
import FlipCard from '@/shared/ui/study/FlipCard'
import ProgressRail from '@/shared/ui/study/ProgressRail'
import StudyActionBar, { BAR_BUTTON_BASE } from '@/shared/ui/study/StudyActionBar'
import AutoDirText from '@/shared/ui/display/AutoDirText'
import { useStudyFontScale } from '@/shared/hooks/useStudyFontScale'
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion'
import { wrapText } from '@/shared/utils/textStyles'
import { accuracyColor } from '@/shared/utils/accuracy'
import { CheckCircleIcon, XCircleIcon } from '@/shared/icons/tool-icons'
import { EXAM_DIVIDER, formatTime } from '@/features/practice/mcqShared'
import type { Answer } from '@/services/flashcards/scheduler'

export interface StudyCardItem {
  id: string
  front: string
  back: string
}

interface FlashcardStudyProps {
  dark: boolean
  accent: string
  title: string
  queue: StudyCardItem[]
  // True for "review anyway" sessions: answers are never saved or scheduled.
  practice?: boolean
  onRate: (cardId: string, answer: Answer) => void
  onFinish: () => void
  onMore: () => void
  onExit: () => void
}

const MAX_WIDTH = 'min(820px, 92vw)'

// Verdict tint and message shown on the card after an answer.
const VERDICT = {
  again: { bg: '#fdeceb', fg: '#b4382c', label: "You'll get it next time" },
  good: { bg: '#e5f7ec', fg: '#17773b', label: 'Got it' },
} as const

const MISSED_COLOR = '#f87171'
const KNOWN_COLOR = '#4ade80'

// Timings (ms) of the answer animation.
const TILT_MS = 180
const HOLD_MS = 320
const FLY_MS = 300

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// One number with a small caption, used on the end screen.
function Stat({ label, value, color, mutedColor }: { label: string; value: string | number; color: string; mutedColor: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 22, color }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: mutedColor, marginTop: 2 }}>{label}</div>
    </div>
  )
}

// Runs one study session: "Again" sets a card aside for later, "Got it" removes it (nothing is saved in practice sessions).
export default function FlashcardStudy({ dark, accent, title, queue: initialQueue, practice = false, onRate, onFinish, onMore, onExit }: FlashcardStudyProps) {
  const pt = getPulseTheme(dark)
  const { fontScale, cycleFontScale } = useStudyFontScale()
  const reduced = usePrefersReducedMotion()
  const [scope, animate] = useAnimate()
  const [queue, setQueue] = useState(initialQueue)
  const [missed, setMissed] = useState<StudyCardItem[]>([])
  const [total, setTotal] = useState(initialQueue.length)
  const [round, setRound] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [right, setRight] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [verdict, setVerdict] = useState<Answer | null>(null)
  const [finishSec, setFinishSec] = useState(0)
  const [barHeight, setBarHeight] = useState(96)
  const finishedRef = useRef(false)
  const busyRef = useRef(false)
  const startedAtRef = useRef(Date.now())
  const againRef = useRef<HTMLButtonElement>(null)
  const goodRef = useRef<HTMLButtonElement>(null)
  const current = queue[0] ?? null
  const finished = queue.length === 0
  const answered = right + wrong

  // Applies an answer: rates the card (first round only) and moves to the next one.
  function commit(card: StudyCardItem, result: Answer) {
    if (!practice && round === 0) onRate(card.id, result)
    setVerdict(null)
    setFlipped(false)
    if (result === 'again') {
      setWrong(n => n + 1)
      setMissed(prev => [...prev, card])
    } else {
      setRight(n => n + 1)
    }
    if (queue.length === 1) setFinishSec(Math.round((Date.now() - startedAtRef.current) / 1000))
    setQueue(prev => prev.slice(1))
  }

  // Tilts the card toward the chosen button, tints it, then flies it into that button.
  async function answer(result: Answer) {
    if (!current || !flipped || busyRef.current) return
    busyRef.current = true
    const card = current
    const element = scope.current as HTMLElement | null

    if (reduced || !element) {
      commit(card, result)
      busyRef.current = false
      return
    }

    const dir = result === 'again' ? -1 : 1
    setVerdict(result)
    await animate(element, { rotate: dir * 5, x: dir * 18, scale: 0.98 }, { duration: TILT_MS / 1000, ease: 'easeOut' })
    await pause(HOLD_MS)

    const button = (result === 'again' ? againRef : goodRef).current
    if (button) {
      const card$ = element.getBoundingClientRect()
      const target = button.getBoundingClientRect()
      const dx = target.left + target.width / 2 - (card$.left + card$.width / 2 - dir * 18)
      const dy = target.top + target.height / 2 - (card$.top + card$.height / 2)
      await animate(element, { x: dx, y: dy, scale: 0.12, rotate: dir * 14, opacity: 0 }, { duration: FLY_MS / 1000, ease: 'easeIn' })
    }

    commit(card, result)
    if (scope.current) {
      await animate(scope.current, { x: 0, y: 0, rotate: 0, scale: 0.94, opacity: 0 }, { duration: 0 })
      animate(scope.current, { scale: 1, opacity: 1 }, { duration: 0.2, ease: 'easeOut' })
    }
    busyRef.current = false
  }

  // Starts a practice round with the cards that were marked "Again".
  function reviewMissed() {
    startedAtRef.current = Date.now()
    setQueue(missed)
    setTotal(missed.length)
    setMissed([])
    setRight(0)
    setWrong(0)
    setFlipped(false)
    setRound(r => r + 1)
  }

  const answerRef = useRef(answer)
  answerRef.current = answer
  const toggleRef = useRef(() => {})
  toggleRef.current = () => { if (current && !busyRef.current) setFlipped(f => !f) }

  // Tells the page once when the first round ends so it can upload progress.
  useEffect(() => {
    if (finished && !finishedRef.current) {
      finishedRef.current = true
      onFinish()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  // Keyboard shortcuts: Space/Enter flips the card, 1 = Again, 2 = Got it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleRef.current() }
      else if (e.key === '1') answerRef.current('again')
      else if (e.key === '2') answerRef.current('good')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const textStyle = {
    ...pulseType.cardTitle,
    fontSize: `calc(20px * ${fontScale})`,
    lineHeight: 1.55, color: pt.textPrimary, ...wrapText,
  }
  const doneIndexes = new Set(Array.from({ length: answered }, (_, i) => i))
  const percent = total > 0 ? Math.round((right / total) * 100) : 0

  // Style of a full-width button on the end screen.
  const endButton = (background: string, color: string, border = 'none') => ({
    flex: 1, padding: '14px', borderRadius: 999, background, color, border,
    fontWeight: 800, fontSize: 14, fontFamily: pulseFonts.body, cursor: 'pointer',
  } as const)

  const verdictMeta = verdict ? VERDICT[verdict] : null
  const statusPrefix = round > 0 ? 'MISSED · ' : ''

  return (
    <StudyShell maxWidth={MAX_WIDTH} bottomPadding={finished ? 16 : barHeight + 16}>
      <StudyHeader
        dark={dark}
        eyebrow={title.toUpperCase()}
        status={finished ? 'SESSION COMPLETE' : `${statusPrefix}CARD ${Math.min(answered + 1, total)} / ${total}`}
        fontScale={fontScale}
        onCycleFontScale={finished ? undefined : cycleFontScale}
        onExit={onExit}
      />
      <div style={{ height: 1, background: EXAM_DIVIDER, marginBottom: 16 }} />

      {!finished && current && (
        <>
          <ProgressRail
            total={total}
            currentIndex={Math.min(answered, total - 1)}
            doneIndexes={doneIndexes}
            dark={dark}
            accent={accent}
          />
          <div style={{
            ...pulseType.small, color: ON_GRADIENT_TOP.muted, margin: '-10px 2px 14px 0',
            display: 'flex', justifyContent: 'flex-end', gap: 12,
          }}>
            <span>{queue.length} left</span>
          </div>

          <div ref={scope} style={{ position: 'relative', borderRadius: 18, willChange: 'transform' }}>
            <FlipCard
              key={`${round}-${current.id}`}
              flipped={flipped}
              onToggle={() => { if (!busyRef.current) setFlipped(f => !f) }}
              front={
                <StudyCard dark={dark} height={STUDY_CARD_HEIGHT}>
                  <AutoDirText text={current.front} style={textStyle} />
                </StudyCard>
              }
              back={
                <StudyCard dark={dark} height={STUDY_CARD_HEIGHT}>
                  <AutoDirText text={current.back} style={textStyle} />
                </StudyCard>
              }
            />
            {verdictMeta && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', inset: 0, zIndex: 2, borderRadius: 18, pointerEvents: 'none',
                  background: verdictMeta.bg, color: verdictMeta.fg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 24, textAlign: 'center',
                  fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 'clamp(20px, 4vw, 28px)',
                }}
              >{verdictMeta.label}</motion.div>
            )}
          </div>

          <StudyActionBar
            dark={dark}
            ariaLabel="Flashcard actions"
            maxWidth={MAX_WIDTH}
            onHeightChange={setBarHeight}
            hint="Space to flip · 1 Again · 2 Got it"
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0 6px 8px', fontSize: 12, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            }}>
              <span style={{ color: MISSED_COLOR, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <XCircleIcon color={MISSED_COLOR} size={13} /> {wrong} missed
              </span>
              <span style={{ color: KNOWN_COLOR, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {right} known <CheckCircleIcon color={KNOWN_COLOR} size={13} />
              </span>
            </div>
            {!flipped ? (
              <button
                onClick={() => setFlipped(true)}
                className="study-btn glass-focus-ring"
                style={{
                  ...BAR_BUTTON_BASE, width: '100%',
                  background: accent, border: `1px solid ${accent}`, color: '#0f172a',
                  boxShadow: `0 6px 20px ${accent}40`,
                }}
              >Show answer</button>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  ref={againRef}
                  onClick={() => answer('again')}
                  className="study-btn glass-focus-ring"
                  style={{
                    ...BAR_BUTTON_BASE, flex: 1,
                    background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.55)', color: '#f87171',
                  }}
                >Again</button>
                <button
                  ref={goodRef}
                  onClick={() => answer('good')}
                  className="study-btn glass-focus-ring"
                  style={{
                    ...BAR_BUTTON_BASE, flex: 1,
                    background: accent, border: `1px solid ${accent}`, color: '#0f172a',
                    boxShadow: `0 6px 20px ${accent}40`,
                  }}
                >Got it</button>
              </div>
            )}
          </StudyActionBar>
        </>
      )}

      {finished && (
        <StudyCard dark={dark} style={{ alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CheckCircleIcon color={accent} size={40} />
          </div>
          <div style={{ ...pulseType.sectionLabel, color: pt.textMuted, marginTop: 14 }}>
            {round === 0 ? 'First-try accuracy' : 'Review accuracy'}
          </div>
          <div style={{ ...pulseType.display, color: accuracyColor(percent, pt), margin: '4px 0 2px' }}>{percent}%</div>
          <div style={{ ...pulseType.small, color: pt.textMuted }}>of cards known</div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, margin: '24px 0', flexWrap: 'wrap' }}>
            <Stat label="KNOWN" value={right} color={pt.success} mutedColor={pt.textMuted} />
            <Stat label="MISSED" value={wrong} color={wrong > 0 ? pt.danger : pt.textPrimary} mutedColor={pt.textMuted} />
            <Stat label="TIME" value={formatTime(finishSec)} color={pt.textPrimary} mutedColor={pt.textMuted} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            {missed.length > 0 && (
              <button className="study-btn" onClick={reviewMissed} style={{ ...endButton(accent, '#0f172a'), flex: 'none' }}>
                Review {missed.length} missed card{missed.length === 1 ? '' : 's'}
              </button>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="study-btn" onClick={onExit} style={endButton('transparent', pt.sub, `1px solid ${pt.border}`)}>Done</button>
              <button
                className="study-btn"
                onClick={onMore}
                style={missed.length > 0 ? endButton('transparent', pt.sub, `1px solid ${pt.border}`) : endButton(accent, '#0f172a')}
              >{practice ? 'Review again' : 'Study more'}</button>
            </div>
          </div>
        </StudyCard>
      )}
    </StudyShell>
  )
}
