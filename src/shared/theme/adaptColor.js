// Adjusts a text or icon color so it stays readable on the glass cards of the current color mode.
// Only the lightness changes (hue and saturation are kept) and only when the contrast target is missed,
// so colors that already read well pass through untouched. Use it for colors drawn as text or icons;
// fills such as buttons, badges and bars can keep the original color.

// Approximate relative luminance of the glass surface in each mode: white 35% over #93C5FD (light),
// and the light-blue wash over #0B1F3B (dark).
const SURFACE_LUMINANCE = { light: 0.67, dark: 0.03 }

// Minimum contrast ratio against that surface. Slightly relaxed in dark mode so the existing dark accents keep their look.
const TARGET_CONTRAST = { light: 4.5, dark: 4 }

// Parses #rgb or #rrggbb into channel values; returns null for anything else.
function hexToRgb(hex) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || '')
  if (!match) return null
  let value = match[1]
  if (value.length === 3) value = value.split('').map(c => c + c).join('')
  const n = parseInt(value, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

// Formats channel values as #rrggbb.
function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
}

// WCAG relative luminance of an sRGB color.
function luminance({ r, g, b }) {
  const linear = v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

// WCAG contrast ratio between two relative luminances.
function contrast(a, b) {
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}

// Converts sRGB channels to hue (0-360), saturation (0-1) and lightness (0-1).
function rgbToHsl({ r, g, b }) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s, l }
}

// Converts hue, saturation and lightness back to sRGB channels.
function hslToRgb({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

// Returns the color unchanged when it already reaches the contrast target on the current mode's cards;
// otherwise the nearest lightness (darker in light mode, lighter in dark mode) that does.
// Anything that is not a hex color (for example a CSS variable) is returned as given.
export function adaptColor(hex, dark) {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const mode = dark ? 'dark' : 'light'
  const surface = SURFACE_LUMINANCE[mode]
  const target = TARGET_CONTRAST[mode]
  const passes = candidate => contrast(luminance(candidate), surface) >= target
  if (passes(rgb)) return hex

  const { h, s, l } = rgbToHsl(rgb)
  // Light mode searches between black and the original lightness; dark mode between the original and white.
  // The search keeps the end that passes and moves the other end toward it.
  let low = dark ? l : 0
  let high = dark ? 1 : l
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2
    const ok = passes(hslToRgb({ h, s, l: mid }))
    if (dark) {
      if (ok) high = mid
      else low = mid
    } else if (ok) low = mid
    else high = mid
  }
  return rgbToHex(hslToRgb({ h, s, l: dark ? high : low }))
}
