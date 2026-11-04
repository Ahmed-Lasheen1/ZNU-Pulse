import { useState, useEffect, useRef } from 'react'
import { getPulseTheme, pulseFonts, pulseType } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import AutoDirText from '@/shared/ui/display/AutoDirText'
import { wrapText } from '@/shared/utils/textStyles'
import { CheckCircleIcon } from '@/shared/icons/tool-icons'
import type { Answer } from '@/services/flashcards/scheduler'

export interface StudyCard {
  id: string
  front: string
  back: string
}

interface FlashcardStudyProps {
  dark: boolean
  accent: string
  title: string
  queue: StudyCard[]
  onRate: (cardId: string, answer: Answer) => void
  onFinish: () => void
  onMore: () => void
  onExit: () => void
}

// Runs one study session: shows a card, reveals the answer, and records "Again" or "Got it".
export default function FlashcardStudy({ dark, accent, title, queue: initialQueue, onRate, onFinish, onMore, onExit }: FlashcardStudyProps) {
  const pt = getPulseTheme(dark)
  const [queue, setQueue] = useState(initialQueue)
  const [flipped, setFlipped] = useState(false)
  const [mastered, setMastered] = useState(0)
  const finishedRef = useRef(false)
  const total = initialQueue.length
  const current = queue[0] ?? null

  // Records the answer; "Again" sends the card to the back of the queue, "Got it" removes it.
  function answer(result: Answer) {
    if (!current || !flipped) return
    onRate(current.id, result)
    setFlipped(false)
    setQueue(prev => (result === 'again' ? [...prev.slice(1), prev[0]] : prev.slice(1)))
    if (result === 'good') setMastered(n => n + 1)
  }

  const answerRef = useRef(answer)
  answerRef.current = answer
  const flipRef = useRef(() => {})
  flipRef.current = () => { if (current && !flipped) setFlipped(true) }

  // Tells the page once when the queue is empty so it can upload progress.
  useEffect(() => {
    if (queue.length === 0 && !finishedRef.current) {
      finishedRef.current = true
      onFinish()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length])

  // Keyboard shortcuts: Space/Enter reveals, 1 = Again, 2 = Got it.
  useEffect(() => {
    // Handles one key press while studying.
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

  const textStyle = { ...pulseType.cardTitle, fontSize: 20, lineHeight: 1.55, color: pt.textPrimary, ...wrapText }
  const pill = (background: string, color: string, border = 'none') => ({
    flex: 1, padding: '14px', borderRadius: 999, background, color, border,
    fontWeight: 800, fontSize: 14, fontFamily: pulseFonts.body, cursor: 'pointer',
  } as const)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ ...pulseType.sectionLabel, color: accent, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <button onClick={onExit} style={{
          background: 'transparent', border: `1px solid ${pt.border}`, color: pt.sub, borderRadius: 999,
          padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: pulseFonts.body, flexShrink: 0,
        }}>✕ Exit</button>
      </div>

      <div style={{ height: 5, borderRadius: 999, overflow: 'hidden', background: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)', marginBottom: 6 }}>
        <div style={{ height: '100%', width: `${total > 0 ? (mastered / total) * 100 : 0}%`, background: accent, borderRadius: 999, transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ ...pulseType.small, color: pt.textMuted, textAlign: 'right', marginBottom: 14 }}>{queue.length} left</div>

      {current ? (
        <>
          <div onClick={() => { if (!flipped) setFlipped(true) }}>
            <LiquidGlassCard dark={dark} delay={0} style={{ padding: 'clamp(22px, 4vw, 36px)', minHeight: 'clamp(240px, 42vh, 420px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <AutoDirText text={current.front} style={textStyle} />
              {flipped && (
                <div style={{ marginTop: 22, paddingTop: 22, borderTop: `1px solid ${pt.border}` }}>
                  <AutoDirText text={current.back} style={{ ...textStyle, color: accent }} />
                </div>
              )}
            </LiquidGlassCard>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {!flipped ? (
              <button onClick={() => setFlipped(true)} style={pill(accent, '#0f172a')}>Show answer</button>
            ) : (
              <>
                <button onClick={() => answer('again')} style={pill('transparent', pt.danger, `1.5px solid ${pt.danger}`)}>Again</button>
                <button onClick={() => answer('good')} style={pill(accent, '#0f172a')}>Got it</button>
              </>
            )}
          </div>
          <div className="kbd-hint" style={{ ...pulseType.small, color: pt.textMuted, textAlign: 'center', marginTop: 10 }}>
            Space to reveal · 1 Again · 2 Got it
          </div>
        </>
      ) : (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: '36px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <CheckCircleIcon color={accent} size={40} />
          </div>
          <div style={{ ...pulseType.sectionTitle, color: pt.textPrimary, marginBottom: 4 }}>Session complete</div>
          <div style={{ ...pulseType.small, color: pt.textMuted, marginBottom: 20 }}>{total} card{total === 1 ? '' : 's'} reviewed</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onExit} style={pill('transparent', pt.sub, `1px solid ${pt.border}`)}>Done</button>
            <button onClick={onMore} style={pill(accent, '#0f172a')}>Study more</button>
          </div>
        </LiquidGlassCard>
      )}
    </div>
  )
}
