import { pulseFonts, ON_BACKGROUND } from '@/shared/theme/premiumTheme'

// Text and divider colors for the study screens' text drawn directly on the page background.
// They follow the color mode (see ON_BACKGROUND).
export const EXAM_LOW_TEXT = ON_BACKGROUND.primary
export const EXAM_LOW_SECONDARY = ON_BACKGROUND.secondary
export const EXAM_DIVIDER = ON_BACKGROUND.divider

export const optionLabels = ['a', 'b', 'c', 'd']
export const optionTexts = (q: any) => [q.option_a, q.option_b, q.option_c, q.option_d]
export const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

// Big number with a small caption, used for the result stats.
export function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 22, color }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color, opacity: 0.75, marginTop: 2 }}>{label}</div>
    </div>
  )
}

// Neutral pill with a colored dot: readable on both light and dark glass.
export function InfoTag({ label, color, dark }: { label: string; color: string; dark: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)'}`,
      color: dark ? '#f1f5f9' : '#10243A',
      borderRadius: 20, padding: '3px 10px',
      fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}
