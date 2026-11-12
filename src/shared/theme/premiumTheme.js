// ZNU Pulse design tokens: fonts, type scale, page-text colors and the per-mode theme palette.
import { FONT_FAMILY, type as pulseType } from '@/shared/theme/typography'

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

// Text drawn directly on the flat page background (no glass surface underneath). The values are CSS variables
// defined per color mode in src/styles/index.css, so they switch with data-theme without a re-render.
// Use them only where a whole color is expected, never with a hex alpha suffix appended.
export const ON_BACKGROUND = {
  primary: 'var(--on-bg-primary)',
  secondary: 'var(--on-bg-secondary)',
  muted: 'var(--on-bg-muted)',
  divider: 'var(--on-bg-divider)',
}

// Full theme token set, keyed by dark/light. The light values are tuned for the #93C5FD page and its glass cards
// (accents at least ~4.5:1 on the glass, text well above that).
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

        text: '#FFFFFF',
        sub: 'rgba(255,255,255,0.82)',
        faint: 'rgba(255,255,255,0.62)',
        textPrimary: '#FFFFFF',
        textSecondary: 'rgba(255,255,255,0.82)',
        textMuted: 'rgba(255,255,255,0.62)',

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
        border: 'rgba(6,43,80,0.32)',
        borderStrong: 'rgba(6,43,80,0.5)',

        text: '#10243A',
        sub: '#29445C',
        faint: '#375069',
        textPrimary: '#10243A',
        textSecondary: '#29445C',
        textMuted: '#375069',

        cobalt: '#075985',
        cobaltSoft: 'rgba(7,89,133,0.12)',
        cobaltBorder: 'rgba(7,89,133,0.4)',
        textAccent: '#075985',
        indigo: '#4338CA',
        indigoSoft: 'rgba(67,56,202,0.12)',
        terracotta: '#9A3412',
        terracottaSoft: 'rgba(154,52,18,0.12)',
        amber: '#9A3412',
        warning: '#9A3412',
        danger: '#991B1B',
        error: '#991B1B',
        success: '#166534',

        ecgBase: '#C7D3E3',
        ecgLine: '#1E3F91',
        ecgGlow: '#075985',
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
