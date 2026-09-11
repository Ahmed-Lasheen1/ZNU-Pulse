import KineticGrid from '../ui/kinetic-grid'

// Full-bleed background gradient shared by every ZNU Pulse page —
// extracted verbatim from Home's original LOGO_BG constant so every
// page uses the exact same gradient rather than redefining it.
// 100dvh (not just inset:0) so iOS Safari's collapsing/expanding
// address bar doesn't leave a gap at the bottom — same reasoning as
// the original Home implementation.
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
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        height: '100dvh',
        zIndex: 0, pointerEvents: 'none',
        background: PULSE_BG,
        overflow: 'hidden',
      }}
    >
      {interactive && <KineticGrid overlay opacity={0.5} />}
    </div>
  )
}
