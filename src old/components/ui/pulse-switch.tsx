// src/components/ui/pulse-switch.tsx
import { motion } from 'framer-motion'
import { getPulseTheme } from '../../premiumTheme'

interface PulseSwitchProps {
  on: boolean
  onClick: () => void
  disabled?: boolean
  dark: boolean
  ariaLabel?: string
  size?: number
}

const BASE_W = 46
const BASE_H = 26
const TRACK_PADDING = 3
const BORDER_WIDTH = 1.5
const THUMB_SIZE = BASE_H - TRACK_PADDING * 2

export default function PulseSwitch({ on, onClick, disabled, dark, ariaLabel, size = 1 }: PulseSwitchProps) {
  const pt = getPulseTheme(dark)

  const trackW = BASE_W * size
  const trackH = BASE_H * size
  const padding = TRACK_PADDING * size
  const borderWidth = BORDER_WIDTH * size
  const thumbSize = THUMB_SIZE * size
  // AUDIT FIX: box-sizing:border-box (global, see index.css) means
  // `trackW` already includes the border — the content box the thumb
  // travels within is narrower than that by the border on both sides,
  // not just the padding. Previously only padding was subtracted,
  // which pushed the thumb past center toward the right edge when
  // "on". Border width is now also scaled by `size`, matching every
  // other dimension here, so this stays correct at any size.
  const thumbTravel = trackW - thumbSize - padding * 2 - borderWidth * 2

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel || (on ? 'Turn off' : 'Turn on')}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center',
        width: trackW, height: trackH, flexShrink: 0,
        borderRadius: 999, padding,
        border: `${borderWidth}px solid ${pt.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        outline: 'none',
        background: on
          ? (dark
              ? `linear-gradient(135deg, ${pt.cobalt}55, ${pt.indigo}55)`
              : `linear-gradient(135deg, ${pt.cobalt}30, ${pt.indigo}30)`)
          : (dark
              ? `radial-gradient(ellipse at top left, ${pt.surfaceRaised} 0%, ${pt.canvas} 100%)`
              : `radial-gradient(ellipse at top left, #ffffff 0%, ${pt.surfaceFlat} 100%)`),
        boxShadow: dark
          ? 'inset 2px 2px 5px rgba(0,0,0,0.45), inset -2px -2px 5px rgba(90,120,165,0.25)'
          : 'inset 2px 2px 5px rgba(175,192,214,0.3), inset -2px -2px 5px rgba(255,255,255,0.9)',
        transition: 'background 0.2s ease',
      }}
    >
      <motion.span
        aria-hidden
        style={{
          display: 'block',
          width: thumbSize, height: thumbSize,
          borderRadius: 999,
          background: on
            ? `linear-gradient(145deg, #7fb0ff 0%, ${pt.cobalt} 60%, #2a5cd8 100%)`
            : (dark
                ? 'linear-gradient(145deg, #4a5a72 0%, #38445a 100%)'
                : `linear-gradient(145deg, #ffffff 0%, ${pt.surfaceFlat} 100%)`),
          boxShadow: on
            ? '0 2px 6px rgba(56,134,255,0.4), inset 1px 1px 2px rgba(255,255,255,0.4)'
            : (dark
                ? '0 2px 4px rgba(0,0,0,0.35), inset 1px 1px 2px rgba(255,255,255,0.1)'
                : '0 2px 4px rgba(0,0,0,0.12), inset 1px 1px 2px rgba(255,255,255,1)'),
        }}
        animate={{ x: on ? thumbTravel : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      />
    </button>
  )
}
