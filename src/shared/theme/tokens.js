// Shared design tokens that were previously repeated as literals across pages.

// Corner radii: small controls, cards/inputs, large cards, fully round pills.
export const RADIUS = { sm: 8, md: 12, lg: 18, pill: 999 }

// Stacking order of fixed layers; keep every z-index in the app on this scale.
export const Z = {
  backBar: 400,
  actionBar: 450,
  header: 500,
  offline: 600,
  navMenu: 2000,
  viewer: 2100,
  panel: 3000,
  dialog: 4000,
  toast: 4100,
}

// Text color drawn on a solid accent fill (buttons, badges).
export const ON_ACCENT = '#0f172a'

// Opacity of disabled controls.
export const DISABLED_OPACITY = 0.6
