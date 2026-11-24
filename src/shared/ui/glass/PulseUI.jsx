import { pulseFonts } from '@/shared/theme/premiumTheme'
import { liquidGlassBackdrop, liquidGlassTint } from '@/shared/theme/liquidGlass'

// Shared glass-style input primitive used by Auth, Profile, Checklist, Review, Pulse Check and Admin —
// background and blur derive from theme/liquidGlass.js, so tuning glass opacity is a one-file change.
// Buttons live in shared/ui/controls/Button.

// Glass input style. Typed as CSSProperties so TSX callers can spread it into `style`.
/** @returns {import('react').CSSProperties} */
export function glassInput(pt, dark) {
  return {
    width: '100%', padding: '15px 20px', marginBottom: 14,
    borderRadius: 999, border: `1px solid ${pt.border}`,
    background: liquidGlassTint(dark),
    ...liquidGlassBackdrop(),
    color: pt.text, fontSize: 14, fontFamily: pulseFonts.body, outline: 'none', boxSizing: 'border-box'
  }
}
