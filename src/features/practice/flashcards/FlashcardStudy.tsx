import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import AutoDirText from '@/shared/ui/display/AutoDirText'
import { wrapText } from '@/shared/utils/textStyles'
import { CheckCircleIcon, RefreshIcon } from '@/shared/icons/tool-icons'
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion'
import { FLASHCARD_ACCENT, FLASHCARD_ACCENT_DEEP } from '@/shared/theme/accents'
import type { Answer } from '@/services/flashcards/scheduler'

export interface StudyCard {
  id: string
  front: string
  back: string
}

interface FlashcardStudyProps {
  dark: boolean
  title: string
  // True for a "review anyway" round, which never changes the schedule.
  practice?: boolean
  queue: StudyCard[]
  onRate: (cardId: string, answer: Answer) => void
  onFinish: () => void
  onMore: () => void
  onExit: () => void
}

const AGAIN_COLOR = '#DC2626'

// One study session: a flippable card, then "Again" or "Got it".
export default function FlashcardStudy({ dark, title, practice = false, queue: initialQueue, onRate, onFinish, onMore, onExit }: FlashcardStudyProps) {
  const pt = getPulseTheme(dark)
  const reduced = usePrefersReducedMotion()
  const [queue, setQueue] = useState(initialQueue)
  const [flipped, setFlipped] = useState(false)
  const [mastered, setMastered] = useState(0)
  const [turn, setTurn] = useState(0)
  const finishedRef = useRef(false)
  const total = initialQueue.length
  const current = queue[0] ?? null

  // "Again" sends the card to the back of the queue, "Got it" removes it.
  function answer(result: Answer) {
    if (!current || !flipped) return
    onRate(current.id, result)
    setFlipped(false)
    setTurn(t => t + 1)
    setQueue(prev => (result === 'again' ? [...prev.slice(1), prev[0]] : prev.slice(1)))
    if (result === 'good') setMastered(n => n + 1)
  }

  const answerRef = useRef(answer)
  answerRef.current = answer
  const flipRef = useRef(() => {})
  flipRef.current = () => { if (current) setFlipped(f => !f) }

  useEffect(() => {
    if (queue.length === 0 && !finishedRef.current) {
      finishedRef.current = true
      onFinish()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length])

  // Space/Enter flips, 1 = Again, 2 = Got it.
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

  const accent = dark ? FLASHCARD_ACCENT : FLASHCARD_ACCENT_DEEP
  const frontBg = dark ? pt.surfaceRaised : '#FFFFFF'
  const backBg = dark ? '#123D3C' : '#F0FDFA'
  const edge = dark ? 'rgba(255,255,255,0.14)' : 'rgba(6,43,80,0.12)'
  const stackLayers = Math.max(0, Math.min(2, queue.length - 1))

  const textStyle: CSSProperties = {
    ...pulseType.cardTitle,
    fontSize: 'clamp(19px, 4.4vw, 26px)',
    fontWeight: 600,
    lineHeight: 1.5,
    textAlign: 'center',
    color: pt.textPrimary,
    ...wrapText,
  }

  const faceLabel: CSSProperties = {
    ...pulseType.sectionLabel,
    color: accent,
    textAlign: 'center',
    marginBottom: 14,
  }

  const pill = (background: string): CSSProperties => ({
    flex: 1, padding: '15px', borderRadius: 999, background, color: '#fff',
    border: '1.5px solid rgba(255,255,255,0.85)', boxShadow: '0 8px 22px rgba(1,12,74,0.35)',
    fontWeight: 800, fontSize: 14, fontFamily: pulseFonts.body, cursor: 'pointer',
  })

  const quietPill: CSSProperties = {
    flex: 1, padding: '14px', borderRadius: 999, background: 'transparent', color: pt.sub,
    border: `1px solid ${pt.border}`, fontWeight: 800, fontSize: 14, fontFamily: pulseFonts.body, cursor: 'pointer',
  }

  return (
    <div>
      <style>{`
        .fc-scene {
          position: relative; height: clamp(300px, 52vh, 500px); perspective: 1400px;
          border-radius: 24px; cursor: pointer; box-shadow: 0 18px 40px rgba(1,12,74,0.35);
        }
        .fc-scene:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
        .fc-inner {
          position: relative; width: 100%; height: 100%; transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
        }
        .fc-inner.fc-flipped { transform: rotateY(180deg); }
        .fc-face {
          position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden;
          border-radius: 24px; backface-visibility: hidden; -webkit-backface-visibility: hidden;
        }
        .fc-back { transform: rotateY(180deg); }
        .fc-body { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; padding: 24px 24px 8px; }
        .fc-center { margin: auto 0; width: 100%; }
        .fc-kbd { display: none; }
        @media (hover: hover) and (pointer: fine) { .fc-kbd { display: block; } }
        @media (prefers-reduced-motion: reduce) { .fc-inner { transition: none; } }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.primary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <button onClick={onExit} style={{
          background: 'rgba(1,12,74,0.45)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', borderRadius: 999,
          padding: '7px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: pulseFonts.body, flexShrink: 0,
        }}>✕ Exit</button>
      </div>

      {practice && (
        <div style={{ ...pulseType.small, color: ON_GRADIENT_TOP.secondary, textAlign: 'center', marginBottom: 12 }}>
          Practice round — your review schedule won't change
        </div>
      )}

      <div style={{ height: 6, borderRadius: 999, overflow: 'hidden', background: 'rgba(1,12,74,0.18)', marginBottom: 6 }}>
        <div style={{ height: '100%', width: `${total > 0 ? (mastered / total) * 100 : 0}%`, background: FLASHCARD_ACCENT_DEEP, borderRadius: 999, transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ ...pulseType.small, color: ON_GRADIENT_TOP.secondary, textAlign: 'right', marginBottom: 18 }}>{queue.length} left</div>

      {current ? (
        <>
          <div style={{ position: 'relative', marginBottom: 22 }}>
            {Array.from({ length: stackLayers }, (_, i) => {
              const level = i + 1
              return (
                <div key={level} aria-hidden style={{
                  position: 'absolute', inset: 0, borderRadius: 24, background: frontBg, border: `1px solid ${edge}`,
                  transform: `translateY(${level * 14}px) scale(${1 - level * 0.045})`,
                  opacity: 1 - level * 0.25, zIndex: 0,
                }} />
              )
            })}

            <motion.div
              key={turn}
              initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <div
                className="fc-scene"
                role="button"
                tabIndex={0}
                aria-label={flipped ? 'Flip back to the question' : 'Show the answer'}
                onClick={() => setFlipped(f => !f)}
              >
                <div className={`fc-inner${flipped ? ' fc-flipped' : ''}`}>
                  <div className="fc-face" aria-hidden={flipped} style={{ background: frontBg, border: `1px solid ${edge}` }}>
                    <div style={{ height: 6, background: `${accent}55`, flexShrink: 0 }} />
                    <div className="fc-body">
                      <div style={faceLabel}>Question</div>
                      <div className="fc-center"><AutoDirText text={current.front} style={textStyle} /></div>
                    </div>
                    <div style={{ ...pulseType.small, color: pt.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0 16px', flexShrink: 0 }}>
                      <RefreshIcon color={pt.textMuted} size={13} /> Tap to flip
                    </div>
                  </div>

                  <div className="fc-face fc-back" aria-hidden={!flipped} style={{ background: backBg, border: `1px solid ${edge}` }}>
                    <div style={{ height: 6, background: accent, flexShrink: 0 }} />
                    <div className="fc-body">
                      <div style={faceLabel}>Answer</div>
                      <div className="fc-center"><AutoDirText text={current.back} style={textStyle} /></div>
                    </div>
                    <div style={{ height: 16, flexShrink: 0 }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {!flipped ? (
              <button onClick={() => setFlipped(true)} style={pill(FLASHCARD_ACCENT_DEEP)}>Show answer</button>
            ) : (
              <>
                <button onClick={() => answer('again')} style={pill(AGAIN_COLOR)}>Again</button>
                <button onClick={() => answer('good')} style={pill(FLASHCARD_ACCENT_DEEP)}>Got it</button>
              </>
            )}
          </div>
          <div className="fc-kbd" style={{ ...pulseType.small, color: ON_GRADIENT_TOP.secondary, textAlign: 'center', marginTop: 12 }}>
            Space to flip · 1 Again · 2 Got it
          </div>
        </>
      ) : (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: '36px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <CheckCircleIcon color={accent} size={40} />
          </div>
          <div style={{ ...pulseType.sectionTitle, color: pt.textPrimary, marginBottom: 4 }}>
            {practice ? 'Practice complete' : 'Session complete'}
          </div>
          <div style={{ ...pulseType.small, color: pt.textMuted, marginBottom: 20 }}>{total} card{total === 1 ? '' : 's'} reviewed</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onExit} style={quietPill}>Done</button>
            <button onClick={onMore} style={pill(FLASHCARD_ACCENT_DEEP)}>{practice ? 'Practice more' : 'Study more'}</button>
          </div>
        </LiquidGlassCard>
      )}
    </div>
  )
}
