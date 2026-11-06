import { useState, useEffect, useRef } from 'react'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '@/shared/theme/premiumTheme'
import StudyShell from '@/shared/ui/study/StudyShell'
import StudyHeader from '@/shared/ui/study/StudyHeader'
import StudyCard, { STUDY_CARD_HEIGHT } from '@/shared/ui/study/StudyCard'
import FlipCard from '@/shared/ui/study/FlipCard'
import ProgressRail from '@/shared/ui/study/ProgressRail'
import StudyActionBar, { BAR_BUTTON_BASE } from '@/shared/ui/study/StudyActionBar'
import AutoDirText from '@/shared/ui/display/AutoDirText'
import { useStudyFontScale } from '@/shared/hooks/useStudyFontScale'
import { wrapText } from '@/shared/utils/textStyles'
import { accuracyColor } from '@/shared/utils/accuracy'
import { CheckCircleIcon } from '@/shared/icons/tool-icons'
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
  onRate: (cardId: string, answer: Answer) => void
  onFinish: () => void
  onMore: () => void
  onExit: () => void
}

const MAX_WIDTH = 'min(820px, 92vw)'

// One number with a small caption, used on the end screen.
function Stat({ label, value, color, mutedColor }: { label: string; value: string | number; color: string; mutedColor: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 22, color }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: mutedColor, marginTop: 2 }}>{label}</div>
    </div>
  )
}

// Runs one study session: flip a card, then record "Again" or "Got it".
export default function FlashcardStudy({ dark, accent, title, queue: initialQueue, onRate, onFinish, onMore, onExit }: FlashcardStudyProps) {
  const pt = getPulseTheme(dark)
  const { fontScale, cycleFontScale } = useStudyFontScale()
  const [queue, setQueue] = useState(initialQueue)
  const [flipped, setFlipped] = useState(false)
  const [mastered, setMastered] = useState(0)
  const [finishSec, setFinishSec] = useState(0)
  const [barHeight, setBarHeight] = useState(96)
  const finishedRef = useRef(false)
  const startedAtRef = useRef(Date.now())
  const retriedRef = useRef(new Set<string>())
  const total = initialQueue.length
  const current = queue[0] ?? null
  const finished = queue.length === 0

  // The back keeps showing the last revealed card while the flip-back plays, so the next answer never flashes.
  const revealedRef = useRef<StudyCardItem | null>(current)
  if (flipped && current) revealedRef.current = current
  const backCard = revealedRef.current

  // Records the answer; "Again" sends the card to the back of the queue, "Got it" removes it.
  function answer(result: Answer) {
    if (!current || !flipped) return
    onRate(current.id, result)
    setFlipped(false)
    if (result === 'again') {
      retriedRef.current.add(current.id)
    } else {
      setMastered(n => n + 1)
      if (queue.length === 1) setFinishSec(Math.round((Date.now() - startedAtRef.current) / 1000))
    }
    setQueue(prev => (result === 'again' ? [...prev.slice(1), prev[0]] : prev.slice(1)))
  }

  const answerRef = useRef(answer)
  answerRef.current = answer
  const flipRef = useRef(() => {})
  flipRef.current = () => { if (current && !flipped) setFlipped(true) }

  // Tells the page once when the queue is empty so it can upload progress.
  useEffect(() => {
    if (finished && !finishedRef.current) {
      finishedRef.current = true
      onFinish()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  // Keyboard shortcuts: Space/Enter reveals, 1 = Again, 2 = Got it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipRef.current() }
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
  const doneIndexes = new Set(Array.from({ length: mastered }, (_, i) => i))
  const retried = retriedRef.current.size
  const firstTryPercent = total > 0 ? Math.round(((total - retried) / total) * 100) : 0
  const endButton = (background: string, color: string, border = 'none') => ({
    flex: 1, padding: '14px', borderRadius: 999, background, color, border,
    fontWeight: 800, fontSize: 14, fontFamily: pulseFonts.body, cursor: 'pointer',
  } as const)

  return (
    <StudyShell maxWidth={MAX_WIDTH} bottomPadding={finished ? 16 : barHeight + 16}>
      <StudyHeader
        dark={dark}
        eyebrow={`ZNU · ${title.toUpperCase()}`}
        status={finished ? 'SESSION COMPLETE' : `CARD ${Math.min(mastered + 1, total)} / ${total}`}
        fontScale={fontScale}
        onCycleFontScale={finished ? undefined : cycleFontScale}
        onExit={onExit}
      />
      <div style={{ height: 1, background: EXAM_DIVIDER, marginBottom: 16 }} />

      {!finished && current && backCard && (
        <>
          <ProgressRail
            total={total}
            currentIndex={Math.min(mastered, total - 1)}
            doneIndexes={doneIndexes}
            dark={dark}
            accent={accent}
          />
          <div style={{ ...pulseType.small, color: ON_GRADIENT_TOP.muted, textAlign: 'right', margin: '-10px 2px 14px 0' }}>
            {queue.length} left
          </div>

          <FlipCard
            flipped={flipped}
            onFlip={() => setFlipped(true)}
            front={
              <StudyCard dark={dark} height={STUDY_CARD_HEIGHT}>
                <AutoDirText text={current.front} style={textStyle} />
              </StudyCard>
            }
            back={
              <StudyCard dark={dark} height={STUDY_CARD_HEIGHT}>
                <AutoDirText text={backCard.back} style={textStyle} />
              </StudyCard>
            }
          />

          <StudyActionBar
            dark={dark}
            ariaLabel="Flashcard actions"
            maxWidth={MAX_WIDTH}
            onHeightChange={setBarHeight}
            hint="Space to reveal · 1 Again · 2 Got it"
          >
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
                  onClick={() => answer('again')}
                  className="study-btn glass-focus-ring"
                  style={{
                    ...BAR_BUTTON_BASE, flex: 1,
                    background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.55)', color: '#f87171',
                  }}
                >Again</button>
                <button
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
          <div style={{ ...pulseType.sectionLabel, color: pt.textMuted, marginTop: 14 }}>First-try accuracy</div>
          <div style={{ ...pulseType.display, color: accuracyColor(firstTryPercent, pt), margin: '4px 0 2px' }}>{firstTryPercent}%</div>
          <div style={{ ...pulseType.small, color: pt.textMuted }}>of cards known without a retry</div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, margin: '24px 0', flexWrap: 'wrap' }}>
            <Stat label="REVIEWED" value={total} color={pt.textPrimary} mutedColor={pt.textMuted} />
            <Stat label="RETRIED" value={retried} color={retried > 0 ? pt.danger : pt.textPrimary} mutedColor={pt.textMuted} />
            <Stat label="TIME" value={formatTime(finishSec)} color={pt.textPrimary} mutedColor={pt.textMuted} />
          </div>

          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button className="study-btn" onClick={onExit} style={endButton('transparent', pt.sub, `1px solid ${pt.border}`)}>Done</button>
            <button className="study-btn" onClick={onMore} style={endButton(accent, '#0f172a')}>Study more</button>
          </div>
        </StudyCard>
      )}
    </StudyShell>
  )
}
