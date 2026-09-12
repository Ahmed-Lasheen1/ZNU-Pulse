// src/lib/liquidGlass.js
// Shared "liquid glass" recipe used by LiquidGlassCard, PulseGlassRow,
// and NavMenu's own glass — tuning the look only ever happens here.

export const LIQUID_GLASS_SHADOW_DARK =
  '0 0 6px rgba(0,0,0,0.03), 0 2px 6px rgba(0,0,0,0.08), inset 3px 3px 0.5px -3px rgba(0,0,0,0.9), inset -3px -3px 0.5px -3px rgba(0,0,0,0.85), inset 1px 1px 1px -0.5px rgba(0,0,0,0.6), inset -1px -1px 1px -0.5px rgba(0,0,0,0.6), inset 0 0 6px 6px rgba(0,0,0,0.12), inset 0 0 2px 2px rgba(0,0,0,0.06), 0 0 12px rgba(255,255,255,0.15)'

export const LIQUID_GLASS_SHADOW_LIGHT =
  '0 0 8px rgba(0,0,0,0.03), 0 2px 6px rgba(0,0,0,0.08), inset 3px 3px 0.5px -3.5px rgba(255,255,255,0.09), inset -3px -3px 0.5px -3.5px rgba(255,255,255,0.85), inset 1px 1px 1px -0.5px rgba(255,255,255,0.6), inset -1px -1px 1px -0.5px rgba(255,255,255,0.6), inset 0 0 6px 6px rgba(255,255,255,0.12), inset 0 0 2px 2px rgba(255,255,255,0.06), 0 0 12px rgba(0,0,0,0.15)'

export function liquidGlassShadow(dark) {
  return dark ? LIQUID_GLASS_SHADOW_DARK : LIQUID_GLASS_SHADOW_LIGHT
}

// backdrop-filter isn't universally supported (older browsers, some
// in-app webviews) — checked once via CSS.supports() so every glass
// surface in the app falls back consistently rather than rendering
// as a near-invisible rectangle.
const SUPPORTS_BACKDROP_FILTER =
  typeof window !== 'undefined' &&
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))

// Real blur when supported; an empty object otherwise (liquidGlassTint
// below compensates by becoming more opaque on unsupported browsers).
export function liquidGlassBackdrop() {
  if (!SUPPORTS_BACKDROP_FILTER) return {}
  return {
    backdropFilter: 'blur(5px) saturate(100%)',
    WebkitBackdropFilter: 'blur(5px) saturate(100%)',
  }
}

// Low-opacity neutral tint layered over the blur to pull the glass
// color back toward grey/white instead of inheriting the page's hue.
// Falls back to a much more opaque flat tint when blur isn't
// supported, so the surface still reads as a card.
export function liquidGlassTint(dark) {
  if (!SUPPORTS_BACKDROP_FILTER) {
    return dark ? 'rgba(38, 44, 60, 0.82)' : 'rgba(255,255,255,0.82)'
  }
  return dark ? 'rgba(60, 60, 70, 0.35)' : 'rgba(255,255,255,0.35)'
}

// Shared border color for glass containers that draw a real CSS
// border directly (PulseGlassRow uses liquidGlassShadow instead).
export function glassBorderColor(dark) {
  return dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)'
}

// Optional, slightly more opaque plate for text/icon content sitting
// over a busier background than this app's fixed calm gradient — not
// applied anywhere automatically today, available as an opt-in layer.
export function liquidGlassPlate(dark) {
  return {
    background: dark ? 'rgba(10, 16, 28, 0.4)' : 'rgba(255,255,255,0.6)',
    borderRadius: 10,
  }
}
