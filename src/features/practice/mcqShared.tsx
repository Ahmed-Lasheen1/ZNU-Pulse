import type { CSSProperties, ReactNode } from 'react'
import { getPulseTheme, pulseFonts } from '@/shared/theme/premiumTheme'
import AutoDirText from '@/shared/ui/display/AutoDirText'
import { LightbulbIcon } from '@/shared/icons/tool-icons'
import { wrapText } from '@/shared/utils/textStyles'

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
