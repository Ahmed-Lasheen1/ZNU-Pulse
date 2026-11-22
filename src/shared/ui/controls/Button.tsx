import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { getPulseTheme, pulseFonts } from '@/shared/theme/premiumTheme'
import { ON_ACCENT, DISABLED_OPACITY, RADIUS } from '@/shared/theme/tokens'

export type ButtonVariant = 'solid' | 'tinted' | 'outline' | 'ghost'
export type ButtonSize = 'xs' | 'sm' | 'md'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  dark: boolean
  // solid: filled accent; tinted: soft accent fill and border; outline: accent border only; ghost: neutral border.
  variant?: ButtonVariant
  // xs: inline tool buttons; sm: row actions; md: primary call to action.
  size?: ButtonSize
  // Accent color; defaults to the theme's cobalt.
  color?: string
  // Text color on a solid fill; defaults to the dark ink used on bright accents (pass '#fff' on dark fills).
  onColor?: string
  fullWidth?: boolean
  children: ReactNode
}

// Padding, font size and weight of each size, matching the pill buttons used across the app.
const SIZES: Record<ButtonSize, CSSProperties> = {
  xs: { padding: '6px 12px', fontSize: 11.5, fontWeight: 700 },
  sm: { padding: '8px 16px', fontSize: 12, fontWeight: 700 },
  md: { padding: '12px 24px', fontSize: 14, fontWeight: 800 },
}

// Shared pill button with the app's four recurring looks; replaces the per-page inline button styles.
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { dark, variant = 'solid', size = 'sm', color, onColor, fullWidth = false, type = 'button', disabled, style, children, ...rest },
  ref
) {
  const pt = getPulseTheme(dark)
  const accent = color ?? pt.cobalt

  const looks: Record<ButtonVariant, CSSProperties> = {
    solid: { background: accent, color: onColor ?? ON_ACCENT, border: 'none' },
    tinted: { background: `${accent}18`, color: accent, border: `1px solid ${accent}55` },
    outline: { background: 'transparent', color: accent, border: `1px solid ${accent}66` },
    ghost: { background: 'transparent', color: pt.sub, border: `1px solid ${pt.border}` },
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: RADIUS.pill, fontFamily: pulseFonts.body, whiteSpace: 'nowrap',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? DISABLED_OPACITY : 1,
        width: fullWidth ? '100%' : undefined,
        ...SIZES[size],
        ...looks[variant],
        ...style,
      }}
    >
      {children}
    </button>
  )
})

export default Button
