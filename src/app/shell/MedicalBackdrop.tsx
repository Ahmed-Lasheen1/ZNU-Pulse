import { createPortal } from 'react-dom'
import type { CSSProperties, ReactNode } from 'react'

// Edge length of each corner artwork; grows with the viewport but never gets tiny or huge.
const CORNER_SIZE = 'clamp(180px, 34vw, 480px)'

// Keeps strokes at a constant 1px however much the corner artwork is scaled.
const STROKE_CSS = `
  .mbd-art path, .mbd-art polyline, .mbd-art polygon, .mbd-art circle { vector-effect: non-scaling-stroke; }
`

// Faint technical grid; the center is masked out so it only shows toward the edges.
const GRID_MASK = 'radial-gradient(ellipse at center, transparent 30%, #000 100%)'

const gridStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 'calc(var(--blueprint-opacity) * 0.45)' as unknown as number,
  backgroundImage:
    'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
  backgroundSize: '56px 56px',
  maskImage: GRID_MASK,
  WebkitMaskImage: GRID_MASK,
}

// One decorative corner: a square SVG pinned to a viewport corner, drawn in the theme ink color.
function Corner({ position, children }: { position: CSSProperties; children: ReactNode }) {
  return (
    <svg
      className="mbd-art"
      viewBox="0 0 400 400"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        position: 'absolute',
        width: CORNER_SIZE,
        height: CORNER_SIZE,
        opacity: 'var(--blueprint-opacity)' as unknown as number,
        ...position,
      }}
    >
      {children}
    </svg>
  )
}

// Subtle medical-blueprint layer behind the UI: neurons, molecular links, contour lines and ECG fragments.
// Static, non-interactive and rendered once; colors come from the --blueprint-* tokens in index.css.
export default function MedicalBackdrop() {
  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none',
        color: 'var(--blueprint-ink)', contain: 'paint',
      }}
    >
      <style>{STROKE_CSS}</style>
      <div style={gridStyle} />

      {/* Upper-left: neuron with branching dendrites. */}
      <Corner position={{ top: 0, left: 0 }}>
        <path d="M60 70 C100 60 130 90 170 80 S240 40 290 60" />
        <path d="M170 80 C190 120 160 150 190 190 S230 240 220 300" />
        <path d="M60 70 C40 110 70 150 50 200 S30 260 60 320" />
        <path d="M190 190 C230 180 260 200 300 190" />
        <path d="M290 60 C320 40 350 50 380 30" />
        <path d="M50 200 C90 210 110 240 140 235" />
        <circle cx="60" cy="70" r="6" />
        <circle cx="170" cy="80" r="3" />
        <circle cx="290" cy="60" r="3" />
        <circle cx="190" cy="190" r="3" />
        <circle cx="220" cy="300" r="3" />
        <circle cx="60" cy="320" r="3" />
        <circle cx="300" cy="190" r="2.5" fill="currentColor" />
        <circle cx="380" cy="30" r="2.5" fill="currentColor" />
        <circle cx="140" cy="235" r="2.5" fill="currentColor" />
      </Corner>

      {/* Upper-right: molecular network with a hexagonal ring. */}
      <Corner position={{ top: 0, right: 0 }}>
        <polygon points="340,140 364,154 364,182 340,196 316,182 316,154" />
        <path d="M340 140 L335 95 L290 70 L235 100 L255 150 L316 182" />
        <path d="M335 95 L385 60" />
        <path d="M290 70 L270 20" />
        <path d="M235 100 L175 85 L150 130" />
        <path d="M255 150 L225 205 L270 250" />
        <path d="M364 182 L390 230" />
        <circle cx="335" cy="95" r="4" />
        <circle cx="290" cy="70" r="3" />
        <circle cx="235" cy="100" r="4" />
        <circle cx="255" cy="150" r="3" />
        <circle cx="175" cy="85" r="2.5" fill="currentColor" />
        <circle cx="150" cy="130" r="2.5" fill="currentColor" />
        <circle cx="225" cy="205" r="3" />
        <circle cx="270" cy="250" r="2.5" fill="currentColor" />
        <circle cx="385" cy="60" r="2.5" fill="currentColor" />
        <circle cx="270" cy="20" r="2.5" fill="currentColor" />
        <circle cx="390" cy="230" r="2.5" fill="currentColor" />
      </Corner>

      {/* Lower-left: anatomical contour lines, like a scan or topographic map. */}
      <Corner position={{ bottom: 0, left: 0 }}>
        <path d="M0 250 C50 220 110 244 160 212 S250 160 330 172" />
        <path d="M0 290 C60 262 120 290 190 258 S300 208 400 228" />
        <path d="M0 330 C70 304 130 330 200 300 S310 260 400 276" />
        <path d="M0 370 C70 346 140 368 210 342 S320 312 400 326" />
        <path d="M60 400 C70 370 110 350 150 352" />
        <circle cx="160" cy="212" r="2.5" fill="currentColor" />
        <circle cx="330" cy="172" r="2.5" fill="currentColor" />
      </Corner>

      {/* Lower-right: ECG fragments and an axis with tick marks. */}
      <Corner position={{ bottom: 0, right: 0 }}>
        <path d="M120 320 H190 l8 -6 8 6 H236 l6 8 6 -64 8 90 6 -34 H300 l8 -8 8 8 H400" />
        <path d="M200 366 H250 l5 -4 5 4 H290 l4 6 4 -30 5 42 4 -18 H340 H400" />
        <path d="M120 392 H400" strokeDasharray="1 9" />
        <path d="M200 380 V392 M280 380 V392 M360 380 V392" />
        <circle cx="248" cy="264" r="3" />
      </Corner>
    </div>,
    document.body,
  )
}
