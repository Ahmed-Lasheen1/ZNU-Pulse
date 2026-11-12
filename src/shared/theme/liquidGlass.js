// Shared "liquid glass" recipe used by LiquidGlassCard, PulseGlassRow,
// and NavMenu's own glass — tune the look only here.

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

// Glass background tint (more opaque when blur is unsupported). The dark tint is a light blue wash so cards
// separate from the navy page; the light tint is white over the light-blue page.
export function liquidGlassTint(dark) {
  if (!SUPPORTS_BACKDROP_FILTER) {
    return dark ? 'rgba(27, 45, 74, 0.88)' : 'rgba(255,255,255,0.82)'
  }
  return dark ? 'rgba(110, 140, 195, 0.16)' : 'rgba(255,255,255,0.35)'
}

// Border color used on glass panels.
export function glassBorderColor(dark) {
  return dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)'
}

// Hover overlay tint shared by glass rows and pills.
export function glassHoverTint(dark) {
  return dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'
}
