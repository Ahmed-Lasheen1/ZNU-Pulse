// ZNU Pulse — additive design tokens for the Home page redesign
// (and shared glass pages like Checklist).
import { FONT_FAMILY, type as pulseType } from './lib/typography'

export const pulseFonts = {
  display: FONT_FAMILY,
  body: FONT_FAMILY,
}

export { pulseType }

export const pulseWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}

// Text rendered directly on PULSE_BG (no glass surface underneath).
// PULSE_BG is a fixed gradient (pale blue top → dark navy bottom) in
// both app themes, so text sitting straight on it needs colors tied
// to gradient position, not the light/dark theme toggle.
export const ON_GRADIENT_TOP = {
  primary: '#062B50',
  secondary: '#062B50',
  muted: 'rgba(6,43,80,0.62)',
}

export const ON_GRADIENT_BOTTOM = {
  primary: '#FFFFFF',
  secondary: 'rgba(255,255,255,0.80)',
  muted: 'rgba(255,255,255,0.62)',
}

// Full theme token set, keyed by dark/light.
export function getPulseTheme(dark) {
  return dark
    ? {
        canvas: '#18263A',
        canvasAlt: '#162238',
        surface: 'linear-gradient(160deg, #263953, #21324A)',
        surfaceFlat: '#263953',
        surfaceRaised: '#2E4262',
        border: '#3A527A66',
        borderStrong: '#4A6690',

        // Dark Liquid Glass text: primary #FFFFFF, secondary .82, muted .62
        text: '#FFFFFF',
        sub: 'rgba(255,255,255,0.82)',
        faint: 'rgba(255,255,255,0.62)',
        textPrimary: '#FFFFFF',
        textSecondary: 'rgba(255,255,255,0.82)',
        textMuted: 'rgba(255,255,255,0.62)',

        // Accents — cyan for links/tags/progress, orange reserved for streaks
        cobalt: '#38BDF8',
        cobaltSoft: 'rgba(56,189,248,0.16)',
        cobaltBorder: 'rgba(56,189,248,0.4)',
        textAccent: '#38BDF8',
        indigo: '#8E7CF6',
        indigoSoft: 'rgba(142,124,246,0.16)',
        terracotta: '#FF6B00',
        terracottaSoft: 'rgba(255,107,0,0.16)',
        amber: '#FF6B00',
        warning: '#FF6B00',
        danger: '#F87171',
        error: '#F87171',
        success: '#4ADE80',

        ecgBase: '#3A5170',
        ecgLine: '#7FB0FF',
        ecgGlow: '#38BDF8',
      }
    : {
        canvas: '#E9EEF5',
        canvasAlt: '#E6ECF4',
        surface: 'linear-gradient(160deg, #FFFFFF, #F7F9FC)',
        surfaceFlat: '#F7F9FC',
        surfaceRaised: '#FFFFFF',
        border: '#C7D3E3',
        borderStrong: '#AFC0D6',

        // Light Liquid Glass text: primary #10243A, secondary #29445C, muted #405A70
        text: '#10243A',
        sub: '#29445C',
        faint: '#405A70',
        textPrimary: '#10243A',
        textSecondary: '#29445C',
        textMuted: '#405A70',

        // Accents — electric cyan/blue, vibrant crimson-orange for streaks
        cobalt: '#0284C7',
        cobaltSoft: 'rgba(2,132,199,0.10)',
        cobaltBorder: 'rgba(2,132,199,0.35)',
        textAccent: '#0284C7',
        indigo: '#6C5CE3',
        indigoSoft: 'rgba(108,92,227,0.10)',
        terracotta: '#EA580C',
        terracottaSoft: 'rgba(234,88,12,0.12)',
        amber: '#EA580C',
        warning: '#EA580C',
        danger: '#D6543F',
        error: '#D6543F',
        success: '#16A34A',

        ecgBase: '#C7D3E3',
        ecgLine: '#1E3F91',
        ecgGlow: '#0284C7',
      }
}

// Liquid-glass card treatment (background/blur/border/shadow bundle).
export function pulseGlass(dark) {
  return dark
    ? {
        background: 'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: [
          '0 1px 0 rgba(255,255,255,0.04) inset',
          '0 -1px 0 rgba(0,0,0,0.12) inset',
          '0 4px 8px -2px rgba(0,0,0,0.40)',
        ].join(', '),
      }
    : {
        background: 'linear-gradient(160deg, rgba(255,255,255,0.65), rgba(255,255,255,0.35))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: [
          '0 1px 0 rgba(255,255,255,0.4) inset',
          '0 -1px 0 rgba(184,197,216,0.14) inset',
          '0 4px 8px -2px rgba(37,60,97,0.20)',
        ].join(', '),
      }
}

// Shared "← Back" pill button (used by SummaryOverlay's viewer header).
export function backBtnStyle() {
  return {
    background: 'rgba(255,255,255,0.08)',
    border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: 10, padding: '6px 14px',
    color: '#94a3b8', cursor: 'pointer',
    fontSize: 12, fontWeight: 700, fontFamily: pulseFonts.body
  }
}
