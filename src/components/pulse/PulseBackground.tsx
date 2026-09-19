import KineticGrid from '../ui/kinetic-grid'

// Full-bleed background gradient shared by every ZNU Pulse page —
// extracted verbatim from Home's original LOGO_BG constant so every
// page uses the exact same gradient rather than redefining it.
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
        position: 'absolute', top: 0, left: 0, width: '100%',
        // `inset: 0` sizes against the STATIC "large viewport" (as if
        // mobile browser chrome were already hidden), which is why the
        // gradient used to fall short of / get cut off by Android
        // Chrome's address bar and bottom toolbar whenever they were
        // actually showing. `dvh` (dynamic viewport height) live-tracks
        // the real, currently-visible screen instead, so this always
        // fills exactly what's visible with no gap. The plain `100vh`
        // is a fallback for browsers that don't support `dvh` yet —
        // it's overridden by the line after it wherever `dvh` works.
        height: '100dvh',
        // @ts-expect-error -- dvh isn't in the older CSSProperties height type yet; safe to ignore, same value shape as vh.
        '--pulse-bg-h': '100dvh',
        zIndex: 0, pointerEvents: 'none',
        background: PULSE_BG,
        overflow: 'hidden',
      }}
    >
      {interactive && <KineticGrid overlay opacity={0.75} />}
    </div>
  )
}