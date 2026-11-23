import type { CSSProperties, ReactNode } from 'react'
import { getPulseTheme, pulseFonts, ON_BACKGROUND } from '@/shared/theme/premiumTheme'
import AutoDirText from '@/shared/ui/display/AutoDirText'
import { LightbulbIcon } from '@/shared/icons/tool-icons'
import { wrapText } from '@/shared/utils/textStyles'

// Text and divider colors for the study screens' text drawn directly on the page background.
// They follow the color mode (see ON_BACKGROUND).
export const EXAM_LOW_TEXT = ON_BACKGROUND.primary
export const EXAM_LOW_SECONDARY = ON_BACKGROUND.secondary
export const EXAM_DIVIDER = ON_BACKGROUND.divider

export const optionLabels = ['a', 'b', 'c', 'd']
export const optionTexts = (q: any) => [q.option_a, q.option_b, q.option_c, q.option_d]
export const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

// Big number with a small caption, used for the result stats.
// The caption follows the number's color (slightly faded) unless `labelColor` is given.
export function StatChip({ label, value, color, labelColor }: { label: string; value: string | number; color: string; labelColor?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 22, color }}>{value}</div>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
        color: labelColor ?? color, opacity: labelColor ? 1 : 0.75, marginTop: 2,
      }}>{label}</div>
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

export type OptionState = 'correct' | 'wrong' | 'neutral'

// Read-only answer option row used when reviewing a finished question (green when correct, red when chosen wrongly).
export function ReviewOption({ dark, label, text, state }: { dark: boolean; label: string; text: string; state: OptionState }) {
  const pt = getPulseTheme(dark)
  const accent = state === 'correct' ? pt.success : state === 'wrong' ? pt.danger : null
  const background = state === 'correct'
    ? pt.successTint
    : state === 'wrong'
      ? pt.dangerTint
      : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
  const color = accent ?? pt.sub

  return (
    <div style={{
      background, border: `1px solid ${accent ?? pt.border}`,
      borderRadius: 10, padding: '10px 14px', marginBottom: 8,
      display: 'flex', alignItems: 'flex-start', gap: 6, ...wrapText,
    }}>
      <span style={{ flexShrink: 0, color, fontSize: 13, fontWeight: 600 }}>{label.toUpperCase()}.</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <AutoDirText text={text} style={{ color, fontSize: 13, fontWeight: 600, ...wrapText }} />
      </span>
    </div>
  )
}

// Blue explanation box with a lightbulb, shown under answered questions.
export function ExplanationNote({ dark, children, style }: { dark: boolean; children: ReactNode; style?: CSSProperties }) {
  const pt = getPulseTheme(dark)
  return (
    <div style={{
      background: dark ? 'rgba(56,189,248,0.10)' : 'rgba(2,132,199,0.06)',
      borderRadius: 10, padding: '10px 14px', color: pt.sub, fontSize: 12,
      display: 'flex', alignItems: 'flex-start', gap: 8, ...style,
    }}>
      <LightbulbIcon color={pt.sub} size={14} />
      <span style={{ flex: 1, minWidth: 0, ...wrapText }}>{children}</span>
    </div>
  )
}
