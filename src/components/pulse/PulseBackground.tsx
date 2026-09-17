import KineticGrid from '../ui/kinetic-grid'

// Full-bleed background gradient for the whole app — mounted ONCE in
// App.jsx now, not per-page. Uses the "sticky bleed" trick instead of
// `position: fixed` or `position: absolute`:
//
//   position: sticky; top: 0; height: 100dvh; margin-bottom: -100dvh;
//
// This behaves like `fixed` while scrolling (pinned to the top of the
// viewport, always exactly one screen tall, so PULSE_BG's color stops
// always map onto a real 100dvh instead of stretching across the
// whole page's scroll height), but it stays in normal document flow:
// - it doesn't get recalculated against the visual viewport the way
//   `fixed` + `100dvh` does on iOS when the toolbar/status bar
//   collapses or expands (that's what was cutting into the gradient)
// - it never creates a fixed-positioning containing block, so it
//   can't break any OTHER `position: fixed` piece on the page (the
//   header, BackButton, toasts, etc.)
// - unlike `position: absolute`, it isn't sized/clipped by its
//   nearest positioned ancestor — it's sized by the viewport, always
//   100dvh, regardless of how tall the page's content is
//
// The negative margin "gives back" the height it takes up, so it
// doesn't push sibling content down — the next sibling (the app's
// main content wrapper) slides up to sit right after it in the flow,
// while the background itself stays pinned during scroll.
//
// IMPORTANT: nothing between this element and the scrolling root may
// set `overflow` to anything other than `visible`, or the sticky
// behavior breaks (same rule that applies to any `position: sticky`
// element, e.g. AdminSplitLayout's sticky form column).
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

export default function PulseBackground({ interactive = true }: { interactive?: boolean } = {}) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        height: '100dvh',
        marginBottom: '-100dvh',
        zIndex: 0,
        pointerEvents: 'none',
        background: PULSE_BG,
        overflow: 'hidden',
      }}
    >
      {interactive && <KineticGrid overlay opacity={0.75} />}
    </div>
  )
}
