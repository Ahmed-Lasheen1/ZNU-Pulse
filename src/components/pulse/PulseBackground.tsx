import KineticGrid from '../ui/kinetic-grid'

// Full-bleed background gradient shared by every ZNU Pulse page —
// extracted verbatim from Home's original LOGO_BG constant so every
// page uses the exact same gradient rather than redefining it.
//
// This exact gradient is duplicated as a CSS fallback on the <html>
// element in src/index.css — that's what iOS Safari actually paints
// behind the notch/home-indicator safe areas (see the comment there).
// Keep the two in sync if this gradient is ever changed.
export const PULSE_BG = [
  'linear-gradient(180deg,',
  '#a6d2ef 0%,',
  '#97bcd7 15%,',
  '#81a6c3 30%,',
  '#6c8fad 45%,',
  '#497194 60%,',
  '#274e79 75%,',
  '#042a59 90%,',
  '#010c4a 100%)',
].join(' ')

// `interactive` layers the kinetic grid (see components/ui/kinetic-grid.tsx)
// on top of the gradient as a subtle, mouse-reactive texture — an
// overlay, not a replacement, so every page's ON_GRADIENT_TOP /
// ON_GRADIENT_BOTTOM text colors (tuned for this exact gradient) are
// untouched. Defaults to on; pass `interactive={false}` on any page
// where the extra canvas isn't wanted (e.g. if a specific page turns
// out to feel too busy with it, or on very low-power devices).
export default function PulseBackground({ interactive = true }: { interactive?: boolean } = {}) {
  return (
    <div
      aria-hidden
      style={{
        // AUDIT FIX (iOS Safari safe-area "cut out" bug): this used to
        // also set `height: '100dvh'` alongside top/left/right/bottom:0.
        // For a position:fixed element, an explicit height wins over
        // the bottom:0 inset, so the real bottom edge was
        // top(0) + height(100dvh) — not "the true current visual
        // viewport bottom." Safari's dvh value can lag a frame behind
        // its own toolbar/notch animation, leaving a gap at the top
        // (notch) or bottom (home-indicator/bottom-bar) safe area
        // where the gradient didn't reach, exposing a flat bar behind
        // it. `inset: 0` alone stays correctly synced with the true
        // visual viewport with no unit to fall out of sync.
        position: 'fixed', inset: 0,
        zIndex: 0, pointerEvents: 'none',
        background: PULSE_BG,
        overflow: 'hidden',
      }}
    >
      {interactive && <KineticGrid overlay opacity={0.5} />}
    </div>
  )
}
