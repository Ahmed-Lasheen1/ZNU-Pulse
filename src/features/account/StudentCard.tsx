import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Award, X } from 'lucide-react'
import { getPulseTheme, pulseFonts, pulseType } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import { NumberTicker } from '@/shared/ui/motion/number-ticker'
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion'
import type { PulseTheme } from '@/shared/theme/types'
import type { LeaderboardEntry } from '@/services/leaderboard/leaderboard'

interface StudentCardProps {
  dark: boolean
  entry: LeaderboardEntry
  rank: number
  semester: string
  onClose: () => void
}

// What every section of the card receives.
interface SectionContext {
  entry: LeaderboardEntry
  semester: string
  dark: boolean
  pt: PulseTheme
  reduced: boolean
}

// A block of the card. To show something new later, add one entry to SECTIONS below.
interface CardSection {
  id: string
  isVisible: (entry: LeaderboardEntry) => boolean
  render: (ctx: SectionContext) => ReactNode
}

// Medal color of the first three ranks (ties share it); null for everyone else.
export function medalColor(rank: number, pt: PulseTheme): string | null {
  if (rank === 1) return pt.amber
  if (rank === 2) return '#94a3b8'
  if (rank === 3) return '#cd7c2f'
  return null
}

// Small heading above a section.
function SectionTitle({ pt, children }: { pt: PulseTheme; children: ReactNode }) {
  return <div style={{ ...pulseType.sectionLabel, fontSize: 11, color: pt.textMuted, marginBottom: 10 }}>{children}</div>
}

// One number with a caption; counts up unless the user prefers reduced motion.
function StatTile({ label, value, color, delay, dark, pt, reduced }: {
  label: string; value: number; color: string; delay: number; dark: boolean; pt: PulseTheme; reduced: boolean
}) {
  return (
    <div style={{
      flex: '1 1 130px', textAlign: 'center', padding: '14px 16px', borderRadius: 16,
      background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)', border: `1px solid ${pt.border}`,
    }}>
      <div style={{ ...pulseType.display, fontSize: 30, color }}>
        {reduced ? value.toLocaleString() : <NumberTicker value={value} delay={delay} />}
      </div>
      <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  )
}

// Semester and lifetime points of the student.
function PointsSection({ entry, semester, dark, pt, reduced }: SectionContext) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <StatTile label={semester ? `${semester} points` : 'This semester'} value={entry.points} color={pt.amber} delay={0.25} dark={dark} pt={pt} reduced={reduced} />
      {typeof entry.lifetime_points === 'number' && (
        <StatTile label="Lifetime points" value={entry.lifetime_points} color={pt.cobalt} delay={0.35} dark={dark} pt={pt} reduced={reduced} />
      )}
    </div>
  )
}

// Results of the student in earlier semesters, newest first.
function HistorySection({ entry, dark, pt, reduced }: SectionContext) {
  const past = entry.past ?? []
  return (
    <div>
      <SectionTitle pt={pt}>Past semesters</SectionTitle>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {past.map((item, i) => (
          <motion.li
            key={`${item.semester}-${i}`}
            initial={reduced ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: reduced ? 0 : 0.4 + i * 0.06 }}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 12,
              background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)', border: `1px solid ${pt.border}`,
            }}
          >
            <span style={{ ...pulseType.cardTitle, fontSize: 14, color: pt.textPrimary }}>{item.semester}</span>
            <span style={{ ...pulseType.small, fontWeight: 700, color: pt.textSecondary, whiteSpace: 'nowrap' }}>
              #{item.rank} · {item.points.toLocaleString()} pts
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

// Sections of the card in display order; a section with isVisible false is skipped.
const SECTIONS: CardSection[] = [
  { id: 'points', isVisible: () => true, render: ctx => <PointsSection {...ctx} /> },
  { id: 'history', isVisible: entry => (entry.past?.length ?? 0) > 0, render: ctx => <HistorySection {...ctx} /> },
]

// Bottom sheet (dialog on wide screens) with the details of one leaderboard student.
// Render it inside AnimatePresence so it can animate out.
export default function StudentCard({ dark, entry, rank, semester, onClose }: StudentCardProps) {
  const pt = getPulseTheme(dark)
  const reduced = usePrefersReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useBodyScrollLock(true)

  const medal = medalColor(rank, pt)
  const accent = medal ?? pt.cobalt
  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 32 }
  const ctx: SectionContext = { entry, semester, dark, pt, reduced }
  const sections = SECTIONS.filter(section => section.isVisible(entry))

  // Handles Escape and keeps Tab inside the dialog; focus returns to the tapped row on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onCloseRef.current(); return }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [])

  return createPortal(
    <div className="sc-root" role="presentation">
      <style>{`
        .sc-root { position: fixed; inset: 0; z-index: 4000; display: flex; align-items: flex-end; justify-content: center;
          padding: 0 12px calc(12px + env(safe-area-inset-bottom, 0px)); }
        .sc-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
        .sc-sheet { position: relative; width: 100%; max-width: 420px; }
        .sc-scroll { max-height: min(78dvh, 560px); overflow-y: auto; overscroll-behavior: contain; padding: 22px 22px 24px; }
        @media (min-width: 640px) { .sc-root { align-items: center; padding: 20px; } }
      `}</style>

      <motion.div
        className="sc-backdrop" aria-hidden onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
      />

      <motion.div
        ref={dialogRef}
        className="sc-sheet"
        role="dialog" aria-modal="true" aria-labelledby="student-card-title"
        initial={reduced ? false : { opacity: 0, y: 48, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 32, scale: 0.97, transition: { duration: reduced ? 0 : 0.18 } }}
        transition={spring}
      >
        <LiquidGlassCard dark={dark} delay={0} instant tone="hero" style={{ padding: 0 }}>
          <div className="sc-scroll">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <motion.div
                initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...spring, delay: reduced ? 0 : 0.1 }}
                style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: `${accent}30`, border: `2px solid ${accent}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: rank > 99 ? 15 : 20, color: accent,
                }}
              >
                {medal ? <Award size={24} color={accent} /> : rank}
              </motion.div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 id="student-card-title" style={{
                  ...pulseType.sectionTitle, fontSize: 19, margin: 0, color: pt.textPrimary,
                  fontFamily: pulseFonts.display, wordBreak: 'break-word',
                }}>Dr. {entry.name}</h3>
                <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 3 }}>
                  Rank #{rank}{semester ? ` · ${semester}` : ''}
                </div>
              </div>

              <button
                ref={closeRef} type="button" onClick={onClose} aria-label="Close"
                className="glass-focus-ring"
                style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                  background: 'transparent', border: `1px solid ${pt.border}`, color: pt.sub,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              ><X size={16} aria-hidden /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {sections.map((section, i) => (
                <motion.section
                  key={section.id}
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: reduced ? 0 : 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  {section.render(ctx)}
                </motion.section>
              ))}
            </div>
          </div>
        </LiquidGlassCard>
      </motion.div>
    </div>,
    document.body
  )
}
