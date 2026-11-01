// src/pages/mcq/mcqShared.tsx
import { pulseFonts, ON_GRADIENT_TOP, ON_GRADIENT_BOTTOM } from '@/shared/theme/premiumTheme'

export const EXAM_TOP_TEXT = ON_GRADIENT_TOP.primary
export const EXAM_TOP_TEXT_MUTED = ON_GRADIENT_TOP.muted
export const EXAM_LOW_TEXT = ON_GRADIENT_BOTTOM.primary
export const EXAM_LOW_SECONDARY = ON_GRADIENT_BOTTOM.secondary
export const EXAM_LOW_TEXT_MUTED = ON_GRADIENT_BOTTOM.muted
export const EXAM_LOW_SHADOW = '0 1px 6px rgba(1,12,74,0.5)'
export const EXAM_DIVIDER = 'rgba(255,255,255,0.28)'

export const optionLabels = ['a', 'b', 'c', 'd']
export const optionTexts = (q: any) => [q.option_a, q.option_b, q.option_c, q.option_d]
export const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

export function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 22, color, textShadow: EXAM_LOW_SHADOW }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color, opacity: 0.75, marginTop: 2, textShadow: EXAM_LOW_SHADOW }}>{label}</div>
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
