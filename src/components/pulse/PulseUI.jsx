import { getPulseTheme, pulseFonts } from '../../premiumTheme'
import { liquidGlassBackdrop, liquidGlassTint } from '../../lib/liquidGlass'

// Shared glass-style primitives for the ZNU Pulse redesign — used by
// Auth, ResetPassword, and (as we roll it out) every other page, so
// the glass look/feel only needs to be tuned in one place.
//
// AUDIT FIX: every helper below used to hardcode its OWN translucent
// background (e.g. 'rgba(255,255,255,0.045)' for inputs,
// 'rgba(255,255,255,0.3)' for the ghost button, a disabled-state grey
// baked into glassPrimaryBtn) instead of asking lib/liquidGlass.js for
// its one shared tint value via liquidGlassTint(dark). That defeated
// the entire point of centralizing the glass recipe in one file: a
// request like "make every glass surface slightly more transparent"
// would have required editing liquidGlass.js AND separately editing
// every rgba() literal in this file to match, with nothing forcing
// them to agree. Every background below now derives from
// liquidGlassTint(dark) (optionally layered under a semantic color
// for buttons/active-tab states, exactly as LiquidGlassCard and
// PulseGlassRow already do) — so tuning glass opacity globally is now
// genuinely a one-file change, everywhere in the app.
//
// Blur comes from liquidGlassBackdrop() (the same function
// LiquidGlassCard, PulseGlassRow, and NavMenu's glass all use) instead
// of each function here hardcoding its own value. One blur constant,
// tuned in one place (src/lib/liquidGlass.js), applies everywhere now.
// Everything else here — the solid border, pill radius, no heavy card
// shadow — stays as-is; that's what makes an input/button read as
// "interactive" rather than "elevated card," and is unrelated to the
// tint/blur centralization fix.
//
// CLEANUP: PulseFullScreen, GradientBlobs, and glassPanel were removed
// from this file (pre-launch audit) — no remaining page used them;
// every full-screen page renders <PulseBackground> directly instead.

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
    // Disabled state still reads as "glass," just neutral (no accent
    // gradient) — same liquidGlassTint the rest of the system uses
    // for an inactive/neutral glass surface, instead of a one-off
    // grey defined only here.
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

export function glassTabBtn(pt, dark, active) {
  return {
    flex: 1, padding: '9px', borderRadius: 999, cursor: 'pointer',
    border: `1.5px solid ${active ? pt.cobalt : pt.border}`,
    // Active tab layers the accent's soft variant OVER the shared
    // neutral glass tint (same pattern PulseGlassRow's `activeTint`
    // prop already uses) instead of the previous hardcoded
    // rgba(255,255,255,0.03)/0.25 pair that had nothing to do with
    // liquidGlassTint's own value.
    background: active ? pt.cobaltSoft : liquidGlassTint(dark),
    ...liquidGlassBackdrop(),
    color: active ? pt.cobalt : pt.sub, fontWeight: 700, fontSize: 12, fontFamily: pulseFonts.body
  }
}
