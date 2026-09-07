// ZNU Pulse — additive design tokens for the Home page redesign
// (and now shared glass pages like Checklist).
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

// ── Text directly on the PULSE_BG gradient (no glass underneath) ───
// PULSE_BG is a fixed, theme-independent gradient (see
// PulseBackground.tsx) that always runs pale blue at the top to dark
// navy at the bottom, in both light and dark app themes. Anything
// rendered straight on top of it — not inside a
// LiquidGlassCard/PulseGlassRow — needs colors picked for whichever
// zone it actually sits in, not the Liquid Glass tokens below (those
// assume a tinted, blurred backdrop). These two token sets are the
// only approved colors for that case.
//
// AUDIT FIX: `muted` below had drifted to the exact Light Liquid
// Glass muted value ('#405A70'), which is a different token family
// meant for text on a tinted glass backdrop — not for plain text
// directly on the gradient. Restored to the correct alpha-fade of
// this zone's own primary color instead.
export const ON_GRADIENT_TOP = {
  // Text over the light/upper portion of the gradient.
  primary: '#062B50',
  secondary: '#062B50',
  muted: 'rgba(6,43,80,0.62)',
}

export const ON_GRADIENT_BOTTOM = {
  // Text over the dark/lower portion of the gradient.
  primary: '#FFFFFF',
  secondary: 'rgba(255,255,255,0.80)',
  muted: 'rgba(255,255,255,0.62)',
}

export function getPulseTheme(dark) {
  return dark
    ? {
        // Canvas / surfaces — unchanged, out of typography scope.
        canvas: '#18263A',
        canvasAlt: '#162238',
        surface: 'linear-gradient(160deg, #263953, #21324A)',
        surfaceFlat: '#263953',
        surfaceRaised: '#2E4262',
        border: '#3A527A66',
        borderStrong: '#4A6690',

        // Text — Dark Liquid Glass. Primary #FFFFFF, Secondary
        // rgba(255,255,255,.82), Muted rgba(255,255,255,.62) — exact
        // values, not opacity applied to primary.
        text: '#FFFFFF',
        sub: 'rgba(255,255,255,0.82)',
        faint: 'rgba(255,255,255,0.62)',
        textPrimary: '#FFFFFF',
        textSecondary: 'rgba(255,255,255,0.82)',
        textMuted: 'rgba(255,255,255,0.62)',

        // Accents — Bright Cyan for links/tags/progress rings; Neon
        // Orange reserved for status/streak indicators specifically
        // (fire icons, streak counts) so it stays a distinct "hot"
        // highlight rather than competing with cyan everywhere.
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
        danger: '#EF6B57',
        error: '#EF6B57',
        success: '#4ADE80',

        // ECG mark
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

        // Text — Light Liquid Glass. Primary #10243A, Secondary
        // #29445C, Muted #405A70 — exact approved values.
        //
        // AUDIT FIX: `faint`/`textMuted` had drifted to '#526A7F',
        // which is not one of the three approved Light Liquid Glass
        // typography values. Restored to the approved '#405A70'.
        text: '#10243A',
        sub: '#29445C',
        faint: '#405A70',
        textPrimary: '#10243A',
        textSecondary: '#29445C',
        textMuted: '#405A70',

        // Accents — Electric Cyan/Blue replaces the old soft purple-
        // leaning blue for tags/stats; Vibrant Crimson Orange for
        // status/streak indicators.
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

// Liquid-glass card treatment — unchanged, out of typography/color scope.
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

// Shared "← Back" pill button used at the top of full-screen viewer
// pages (SummaryOverlay). Moved here from the now-retired theme.js —
// same visual output, just sourced from the Pulse system instead of
// the old one so theme.js can be deleted with nothing left pointing
// at it.
export function backBtnStyle() {
  return {
    background: 'rgba(255,255,255,0.08)',
    border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: 10, padding: '6px 14px',
    color: '#94a3b8', cursor: 'pointer',
    fontSize: 12, fontWeight: 700, fontFamily: pulseFonts.body
  }
}
