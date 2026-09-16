import KineticGrid from '../ui/kinetic-grid'

// Full-bleed background gradient shared by every ZNU Pulse page —
// extracted verbatim from Home's original LOGO_BG constant so every
// page uses the exact same gradient rather than redefining it.
// Also duplicated as the real html/body background in index.css —
// iOS Safari paints the notch/home-indicator/overscroll strips using
// html/body's own background, not this (or any) fixed child div, so
// the two have to match or those strips show up as a flat bar.
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
//
// `inset: 0` (not an explicit height) so this tracks the true visible
// viewport as Safari's toolbar shows/hides, instead of a `100dvh`
// value that can fall short of the real viewport and leave a gap.
export default function PulseBackground({ interactive = true }: { interactive?: boolean } = {}) {
  return (
    <div
      aria-hidden
      style={{
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
