import KineticGrid from '@/shared/ui/motion/kinetic-grid'

// Full-bleed background gradient shared by every ZNU Pulse page —
// extracted verbatim from Home's original LOGO_BG constant so every
// page uses the exact same gradient rather than redefining it.
export const PULSE_BG = [
  'linear-gradient(180deg,',
  '#c1e8ff 0%,',
  '#7da0ca 15%,',
  '#7da0ca 30%,',
  '#5483b3 45%,',
  '#5483b3 60%,',
  '#052659 75%,',
  '#052659 90%,',
  '#021024 100%)',
].join(' ')

// `interactive` layers the kinetic grid (see components/ui/kinetic-grid.tsx)
// on top of the gradient as a subtle, mouse-reactive texture — an
// overlay, not a replacement, so every page's ON_GRADIENT_TOP /
// ON_GRADIENT_BOTTOM text colors (tuned for this exact gradient) are
// untouched. Defaults to on; pass `interactive={false}` to disable it.
export default function PulseBackground({ interactive = true }: { interactive?: boolean } = {}) {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%',
        height: '100dvh',
        zIndex: 0, pointerEvents: 'none',
        background: PULSE_BG,
        overflow: 'hidden',
      }}
    >
      {interactive && <KineticGrid overlay opacity={0.75} />}
    </div>
  )
}