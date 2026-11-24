import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { getPulseTheme, pulseFonts } from '@/shared/theme/premiumTheme'
import { liquidGlassBackdrop, liquidGlassShadow, liquidGlassTint } from '@/shared/theme/liquidGlass'
import { ON_ACCENT, DISABLED_OPACITY, RADIUS } from '@/shared/theme/tokens'

// solid: filled accent; tinted: soft accent fill and border; outline: accent border only; ghost: neutral border;
// primary: gradient call to action; glass: the app's glass pill (same layers as PulseGlassRow).
export type ButtonVariant = 'solid' | 'tinted' | 'outline' | 'ghost' | 'primary' | 'glass'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'field'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  dark: boolean
  variant?: ButtonVariant
  // xs: inline tool buttons; sm: row actions; md: primary call to action; lg: full-width form action; field: full-width secondary under form fields.
  size?: ButtonSize
  // Accent color (text color for the glass variant); defaults to the theme's cobalt (glass: the muted text color).
  color?: string
  // Text color on a solid or primary fill; defaults to the dark ink used on bright accents ('#fff' on primary).
  onColor?: string
  fullWidth?: boolean
  children: ReactNode
}

// Padding, font size and weight of each size, matching the pill buttons used across the app.
const SIZES: Record<ButtonSize, CSSProperties> = {
  xs: { padding: '6px 12px', fontSize: 11.5, fontWeight: 700 },
  sm: { padding: '8px 16px', fontSize: 12, fontWeight: 700 },
  md: { padding: '12px 24px', fontSize: 14, fontWeight: 800 },
  lg: { padding: '15px', fontSize: 14, fontWeight: 800 },
  field: { padding: '11px', fontSize: 13, fontWeight: 700 },
}

// Shared pill button with the app's recurring looks; replaces the per-page inline button styles.
// It carries the app-wide keyboard focus ring and press feedback (see index.css).
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { dark, variant = 'solid', size = 'sm', color, onColor, fullWidth = false, type = 'button', disabled, className, style, children, ...rest },
  ref
) {
  const pt = getPulseTheme(dark)
  const accent = color ?? pt.cobalt
  const glass = variant === 'glass'

  const looks: Record<ButtonVariant, CSSProperties> = {
    solid: { background: accent, color: onColor ?? ON_ACCENT, border: 'none' },
    tinted: { background: `${accent}18`, color: accent, border: `1px solid ${accent}55` },
    outline: { background: 'transparent', color: accent, border: `1px solid ${accent}66` },
    ghost: { background: 'transparent', color: pt.sub, border: `1px solid ${pt.border}` },
    primary: {
      background: `linear-gradient(135deg, ${pt.cobalt}cc, ${pt.indigo}cc)`, color: onColor ?? '#fff', border: 'none',
      boxShadow: `0 8px 28px ${pt.cobalt}35`, ...liquidGlassBackdrop(),
    },
    glass: {
      position: 'relative', overflow: 'hidden', isolation: 'isolate',
      background: 'transparent', color: color ?? pt.sub, border: 'none', ...liquidGlassBackdrop(),
    },
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      {...rest}
      className={['study-btn', 'glass-focus-ring', className].filter(Boolean).join(' ')}
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
      {glass ? (
        <>
          <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: liquidGlassShadow(dark), pointerEvents: 'none' }} />
          <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: liquidGlassTint(dark), pointerEvents: 'none' }} />
          <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{children}</span>
        </>
      ) : children}
    </button>
  )
})

export default Button
