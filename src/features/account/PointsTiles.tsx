import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion'
import type { PastSemester } from '@/services/leaderboard/leaderboard'

// One starred number with a caption, shown as a tile.
function PointsTile({ value, label, delay, dark }: { value: number; label: string; delay: number; dark: boolean }) {
  const pt = getPulseTheme(dark)
  const reduced = usePrefersReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 26, delay }}
      style={{
        flex: '1 1 0', minWidth: 0, textAlign: 'center', padding: '16px 10px', borderRadius: 16,
        background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)', border: `1px solid ${pt.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Star size={18} color={pt.amber} fill={pt.amber} aria-hidden style={{ flexShrink: 0 }} />
        <span style={{
          ...pulseType.display, fontSize: 'clamp(22px, 6vw, 28px)', lineHeight: 1.1,
          color: pt.textPrimary, fontVariantNumeric: 'tabular-nums',
        }}>{value.toLocaleString()}</span>
      </div>
      <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 6 }}>{label}</div>
    </motion.div>
  )
}

interface PointsTilesProps {
  dark: boolean
  semesterLabel: string
  semesterPoints: number
  // Missing on older saved copies; the lifetime tile is then left out.
  lifetimePoints?: number | null
  delay?: number
}

// Current-semester and lifetime points side by side; shared by the profile and the student card.
export function PointsTiles({ dark, semesterLabel, semesterPoints, lifetimePoints, delay = 0 }: PointsTilesProps) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <PointsTile value={semesterPoints} label={semesterLabel} delay={delay} dark={dark} />
      {typeof lifetimePoints === 'number' && (
        <PointsTile value={lifetimePoints} label="Lifetime" delay={delay + 0.08} dark={dark} />
      )}
    </div>
  )
}

// Finished semesters as plain rows (semester, final rank, points), newest first; renders nothing when empty.
export function PastSemesters({ dark, items, delay = 0 }: { dark: boolean; items: PastSemester[]; delay?: number }) {
  const pt = getPulseTheme(dark)
  const reduced = usePrefersReducedMotion()
  if (items.length === 0) return null

  return (
    <div>
      <div style={{ ...pulseType.sectionLabel, fontSize: 11, color: pt.textMuted, marginBottom: 10 }}>Past semesters</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <motion.li
            key={`${item.semester}-${i}`}
            initial={reduced ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: reduced ? 0 : delay + i * 0.06 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12,
              background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)', border: `1px solid ${pt.border}`,
            }}
          >
            <span style={{ ...pulseType.cardTitle, fontSize: 14, color: pt.textPrimary, flex: 1, minWidth: 0 }}>{item.semester}</span>
            <span style={{ ...pulseType.small, color: pt.textMuted, fontWeight: 700 }}>#{item.rank}</span>
            <span style={{
              ...pulseType.small, fontWeight: 800, color: pt.textPrimary, minWidth: 56, textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}>{item.points.toLocaleString()}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
