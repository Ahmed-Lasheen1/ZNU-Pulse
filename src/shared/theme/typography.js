// Single source of truth for font family + typography hierarchy, re-exported through
// premiumTheme.js (pulseFonts, pulseType). The hierarchy is identical across dark/light;
// only text COLOR values differ per theme (set in premiumTheme.js, not here).
export const FONT_FAMILY = "'Sora', 'Segoe UI', sans-serif"

export const type = {
  // Major dashboard stats / big numbers (e.g. weekly accuracy %, streak)
  display: {
    fontFamily: FONT_FAMILY, fontWeight: 700,
    fontSize: 'clamp(40px, 5vw, 60px)', lineHeight: 1.08, letterSpacing: '-0.035em',
  },
  // Page-level headings
  pageTitle: {
    fontFamily: FONT_FAMILY, fontWeight: 700,
    fontSize: 'clamp(26px, 3vw, 36px)', lineHeight: 1.15, letterSpacing: '-0.025em',
  },
  // Compact page heading for lighter, single-purpose pages (PageIntro, Admin header);
  // distinct from `pageTitle`, the larger responsive heading used for a module's name.
  miniPageTitle: {
    fontFamily: FONT_FAMILY, fontWeight: 800,
    fontSize: 24, lineHeight: 1.2,
  },
  // Section headings within a page
  sectionTitle: {
    fontFamily: FONT_FAMILY, fontWeight: 600,
    fontSize: 19, lineHeight: 1.3, letterSpacing: '-0.01em',
  },
  // Card / row titles (module names, task text, item names)
  cardTitle: {
    fontFamily: FONT_FAMILY, fontWeight: 600,
    fontSize: 16, lineHeight: 1.3,
  },
  // Standard body copy / descriptions
  body: {
    fontFamily: FONT_FAMILY, fontWeight: 400,
    fontSize: 14.5, lineHeight: 1.5,
  },
  // Emphasized body copy (e.g. important inline values)
  bodyEmphasis: {
    fontFamily: FONT_FAMILY, fontWeight: 500,
    fontSize: 14.5, lineHeight: 1.5,
  },
  // Metadata, timestamps, helper text
  small: {
    fontFamily: FONT_FAMILY, fontWeight: 500,
    fontSize: 12.5, lineHeight: 1.4,
  },
  // Uppercase eyebrow labels ("WEEKLY REPORT", "ACTIVE MODULES")
  sectionLabel: {
    fontFamily: FONT_FAMILY, fontWeight: 600,
    fontSize: 11.5, lineHeight: 1.3, letterSpacing: '0.16em', textTransform: 'uppercase',
  },
  button: {
    fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 13.5,
  },
  nav: {
    fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 13.5,
  },
}
