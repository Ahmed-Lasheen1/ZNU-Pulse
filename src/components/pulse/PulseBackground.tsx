import KineticGrid from '../ui/kinetic-grid'

// The actual gradient is painted once, globally, by a body::before
// pseudo-element in src/index.css — see that file for why (fixed
// positioning survives mobile browser quirks that
// background-attachment: fixed does not, and a pseudo-element can't
// interfere with any page's position:sticky/fixed descendants since
// it's a sibling of the React root, never an ancestor).
//
// This component no longer paints any color itself. All it does now
// is optionally layer the interactive kinetic-grid canvas on top —
// KineticGrid's `overlay` mode is already `position: fixed`
// internally (see ui/kinetic-grid.tsx), so it needs no wrapper here
// either.
export default function PulseBackground({ interactive = true }: { interactive?: boolean } = {}) {
  if (!interactive) return null
  return <KineticGrid overlay={true} opacity={0.75} />
}
