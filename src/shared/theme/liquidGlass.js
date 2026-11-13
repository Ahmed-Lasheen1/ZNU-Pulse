// Shared "liquid glass" recipe used by LiquidGlassCard, PulseGlassRow,
// and NavMenu's own glass — tune the look only here.
//
// Surfaces come in three tones: 'standard' (the default everywhere), 'hero' (one main card per page,
// more opaque and lifted) and 'quiet' (repeated shortcuts and secondary rows, more transparent).

export const LIQUID_GLASS_SHADOW_DARK =
  '0 0 6px rgba(0,0,0,0.03), 0 2px 6px rgba(0,0,0,0.08), inset 3px 3px 0.5px -3px rgba(0,0,0,0.9), inset -3px -3px 0.5px -3px rgba(0,0,0,0.85), inset 1px 1px 1px -0.5px rgba(0,0,0,0.6), inset -1px -1px 1px -0.5px rgba(0,0,0,0.6), inset 0 0 6px 6px rgba(0,0,0,0.12), inset 0 0 2px 2px rgba(0,0,0,0.06), 0 0 12px rgba(255,255,255,0.15)'

export const LIQUID_GLASS_SHADOW_LIGHT =
  '0 0 8px rgba(0,0,0,0.03), 0 2px 6px rgba(0,0,0,0.08), inset 3px 3px 0.5px -3.5px rgba(255,255,255,0.09), inset -3px -3px 0.5px -3.5px rgba(255,255,255,0.85), inset 1px 1px 1px -0.5px rgba(255,255,255,0.6), inset -1px -1px 1px -0.5px rgba(255,255,255,0.6), inset 0 0 6px 6px rgba(255,255,255,0.12), inset 0 0 2px 2px rgba(255,255,255,0.06), 0 0 12px rgba(0,0,0,0.15)'

// Shadow layers that give glass panels their edge highlight.
export function liquidGlassShadow(dark) {
  return dark ? LIQUID_GLASS_SHADOW_DARK : LIQUID_GLASS_SHADOW_LIGHT
}

const SUPPORTS_BACKDROP_FILTER =
  typeof window !== 'undefined' &&
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))

// Backdrop blur styles, or none when the browser lacks backdrop-filter.
export function liquidGlassBackdrop() {
  if (!SUPPORTS_BACKDROP_FILTER) return {}
  return {
    backdropFilter: 'blur(5px) saturate(100%)',
    WebkitBackdropFilter: 'blur(5px) saturate(100%)',
  }
}

// Glass tints per color mode and tone. The dark tint is a light blue wash so cards separate from the navy page;
// the light tint is white over the pale-blue page.
const TINTS = {
  dark: {
    standard: 'rgba(110, 140, 195, 0.16)',
    hero: 'rgba(125, 160, 215, 0.26)',
    quiet: 'rgba(110, 140, 195, 0.08)',
  },
  light: {
    standard: 'rgba(255,255,255,0.50)',
    hero: 'rgba(255,255,255,0.70)',
    quiet: 'rgba(255,255,255,0.28)',
  },
}

// Tints used when the browser cannot blur: more opaque so text stays readable without the blur.
const FALLBACK_TINTS = {
  dark: {
    standard: 'rgba(27, 45, 74, 0.88)',
    hero: 'rgba(36, 58, 94, 0.94)',
    quiet: 'rgba(27, 45, 74, 0.72)',
  },
  light: {
    standard: 'rgba(255,255,255,0.82)',
    hero: 'rgba(255,255,255,0.94)',
    quiet: 'rgba(255,255,255,0.66)',
  },
}

// Glass background tint for a color mode and tone ('standard' when omitted or unknown).
/**
 * @param {boolean} dark
 * @param {'standard' | 'hero' | 'quiet'} [tone]
 */
export function liquidGlassTint(dark, tone = 'standard') {
  const table = (SUPPORTS_BACKDROP_FILTER ? TINTS : FALLBACK_TINTS)[dark ? 'dark' : 'light']
  return table[tone] ?? table.standard
}

// Drop shadow that lifts a hero card off the page. Other tones have none, so existing cards are unchanged.
// Applied outside the card's clipped glass box, otherwise it would be cut off.
/**
 * @param {boolean} dark
 * @param {'standard' | 'hero' | 'quiet'} [tone]
 */
export function glassLift(dark, tone = 'standard') {
  if (tone !== 'hero') return 'none'
  return dark ? '0 14px 34px -10px rgba(0,0,0,0.5)' : '0 14px 34px -12px rgba(6,43,80,0.30)'
}

// Border color used on glass panels.
export function glassBorderColor(dark) {
  return dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)'
}

// Hover overlay tint shared by glass rows and pills.
export function glassHoverTint(dark) {
  return dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'
}
