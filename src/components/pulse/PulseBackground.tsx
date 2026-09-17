import KineticGrid from '../ui/kinetic-grid'

// The actual gradient now lives in src/index.css, painted on `html`
// with `background-attachment: fixed` — that gives the same pinned,
// full-viewport-height look this component used to paint itself
// (see index.css for why), without a `position: fixed`/`absolute`
// div in the page tree that could interfere with sticky/fixed
// descendants. PULSE_BG stays exported here (not duplicated) so any
// call site that still imports the raw gradient string for its own
// purposes keeps working unchanged.
//
// All this component still does is optionally layer the interactive
// kinetic-grid canvas on top — KineticGrid's `overlay` mode is
// already `position: fixed` internally (see ui/kinetic-grid.tsx), so
// it needs no wrapper here.
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
  if (!interactive) return null
  return <KineticGrid overlay opacity={0.75} />
}
