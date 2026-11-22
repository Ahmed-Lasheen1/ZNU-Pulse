import type { CSSProperties } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import { ON_ACCENT, RADIUS } from '@/shared/theme/tokens'

interface CheckboxProps {
  dark: boolean
  checked: boolean
  onChange: () => void
  // Accessible name of the checkbox.
  label: string
  color: string
  // square: small task boxes; round: large list checkmarks.
  shape?: 'square' | 'round'
  // solid: filled when checked; soft: tinted when checked.
  variant?: 'solid' | 'soft'
  // Color of the check mark on a solid fill.
  checkColor?: string
  size?: number
  // Font size of the check mark; defaults to 60% of the box size.
  markSize?: number
  disabled?: boolean
  tabIndex?: number
  className?: string
  style?: CSSProperties
}

// Accessible checkbox button shared by the checklist and the lesson lists.
export default function Checkbox({
  dark, checked, onChange, label, color, shape = 'square', variant = 'solid', checkColor,
  size = 18, markSize, disabled = false, tabIndex, className, style,
}: CheckboxProps) {
  const pt = getPulseTheme(dark)
  const round = shape === 'round'
  const solid = variant === 'solid'

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      tabIndex={tabIndex}
      className={className}
      onClick={onChange}
      style={{
        display: 'inline-flex', flexShrink: 0, padding: 0, background: 'transparent', border: 'none',
        borderRadius: round ? '50%' : RADIUS.sm, cursor: disabled ? 'not-allowed' : 'pointer', ...style,
      }}
    >
      <span aria-hidden style={{
        width: size, height: size, boxSizing: 'border-box',
        borderRadius: round ? '50%' : 6,
        border: solid ? `1.5px solid ${checked ? color : pt.faint}` : `1px solid ${checked ? `${color}66` : pt.border}`,
        background: checked ? (solid ? color : `${color}22`) : 'transparent',
        color: solid ? (checkColor ?? ON_ACCENT) : color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: markSize ?? Math.round(size * 0.6), fontWeight: 900,
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}>{checked && '✓'}</span>
    </button>
  )
}
