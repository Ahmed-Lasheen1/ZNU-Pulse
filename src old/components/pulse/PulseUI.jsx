import { getPulseTheme, pulseFonts } from '../../premiumTheme'
import { liquidGlassBackdrop, liquidGlassTint } from '../../lib/liquidGlass'

// Shared glass-style primitives (input/button/tab treatments) used by
// Auth, ResetPassword, and other pages — all backgrounds/blur derive
// from lib/liquidGlass.js so tuning glass opacity is a one-file change.

export function glassInput(pt, dark) {
  return {
    width: '100%', padding: '15px 20px', marginBottom: 14,
    borderRadius: 999, border: `1px solid ${pt.border}`,
    background: liquidGlassTint(dark),
    ...liquidGlassBackdrop(),
    color: pt.text, fontSize: 14, fontFamily: pulseFonts.body, outline: 'none', boxSizing: 'border-box'
  }
}

export function glassPrimaryBtn(pt, dark, disabled) {
  return {
    width: '100%', padding: '15px', borderRadius: 999,
    background: disabled
      ? liquidGlassTint(dark)
      : `linear-gradient(135deg, ${pt.cobalt}cc, ${pt.indigo}cc)`,
    ...liquidGlassBackdrop(),
    color: disabled ? pt.sub : '#fff', border: disabled ? `1px solid ${pt.border}` : 'none',
    fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: pulseFonts.body, fontSize: 14, marginBottom: 12,
    boxShadow: disabled ? 'none' : `0 8px 28px ${pt.cobalt}35`
  }
}

export function glassGhostBtn(pt, dark) {
  return {
    width: '100%', padding: 11, background: liquidGlassTint(dark),
    ...liquidGlassBackdrop(),
    border: `1px solid ${pt.border}`, borderRadius: 999, cursor: 'pointer',
    color: pt.sub, fontFamily: pulseFonts.body, fontSize: 13, fontWeight: 700
  }
}
