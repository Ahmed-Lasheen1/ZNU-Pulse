import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Award, X } from 'lucide-react'
import { getPulseTheme, pulseFonts, pulseType } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'
import { useDialogKeyboard } from '@/shared/hooks/useDialogKeyboard'
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion'
import { PointsTiles, PastSemesters } from '@/features/account/PointsTiles'
import { Z } from '@/shared/theme/tokens'
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

// Sections of the card in display order; a section with isVisible false is skipped.
const SECTIONS: CardSection[] = [
  {
    id: 'points',
    isVisible: () => true,
    render: ({ entry, semester, dark }) => (
      <PointsTiles
        dark={dark}
        semesterLabel={semester ? `${semester} points` : 'This semester'}
        semesterPoints={entry.points}
        lifetimePoints={entry.lifetime_points}
        delay={0.2}
      />
    ),
  },
  {
    id: 'history',
    isVisible: entry => (entry.past?.length ?? 0) > 0,
    render: ({ entry, dark }) => <PastSemesters dark={dark} items={entry.past ?? []} delay={0.45} />,
  },
]

// Bottom sheet (dialog on wide screens) with the details of one leaderboard student.
// Render it inside AnimatePresence so it can animate out.
export default function StudentCard({ dark, entry, rank, semester, onClose }: StudentCardProps) {
  const pt = getPulseTheme(dark)
  const reduced = usePrefersReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useBodyScrollLock(true)
  // Escape closes, Tab stays inside, and focus returns to the tapped row on close (shared with the other dialogs).
  useDialogKeyboard({ open: true, onClose, dialogRef, initialFocusRef: closeRef })

  const medal = medalColor(rank, pt)
  const accent = medal ?? pt.cobalt
  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 32 }
  const ctx: SectionContext = { entry, semester, dark }
  const sections = SECTIONS.filter(section => section.isVisible(entry))

  return createPortal(
    <div className="sc-root" role="presentation">
      <style>{`
        .sc-root { position: fixed; inset: 0; z-index: ${Z.dialog}; display: flex; align-items: flex-end; justify-content: center;
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
              {sections.map(section => (
                <section key={section.id}>{section.render(ctx)}</section>
              ))}
            </div>
          </div>
        </LiquidGlassCard>
      </motion.div>
    </div>,
    document.body
  )
}
