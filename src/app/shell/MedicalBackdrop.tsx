import { createPortal } from 'react-dom'
import { MEDICAL_ICONS } from '@/shared/icons/medicalIcons'

// Keeps stroked icons at a constant thin line however much they are scaled (fill-style icons are unaffected).
// `extra` icons are hidden on phones to keep small screens uncluttered.
const BACKDROP_CSS = `
  .mbd-art path, .mbd-art polyline, .mbd-art polygon, .mbd-art circle, .mbd-art rect { vector-effect: non-scaling-stroke; }
  @media (max-width: 640px) { .mbd-extra { display: none; } }
`

// One scattered icon: a MEDICAL_ICONS key, position in % of the viewport, size in px, rotation in degrees.
interface BackdropIcon {
  key: string
  top: number
  left: number
  size: number
  rotate: number
  extra?: boolean
}

// Hand-placed around the four edges of the viewport so the center stays clear for page content.
// Each key is used once, because the icons define their own clipPath ids.
const BACKDROP_ICONS: BackdropIcon[] = [
  // Top edge.
  { key: 'heart', top: 3, left: 3, size: 56, rotate: -12 },
  { key: 'brain', top: 2, left: 17, size: 52, rotate: 8, extra: true },
  { key: 'lung', top: 5, left: 31, size: 54, rotate: -6 },
  { key: 'microscope', top: 2, left: 47, size: 52, rotate: 10, extra: true },
  { key: 'dna strand', top: 5, left: 62, size: 50, rotate: 14 },
  { key: 'stethoscope', top: 2, left: 77, size: 48, rotate: -10, extra: true },
  { key: 'shot', top: 4, left: 91, size: 46, rotate: -20 },

  // Left edge.
  { key: 'kidney', top: 19, left: 3, size: 46, rotate: 18, extra: true },
  { key: 'neurology', top: 34, left: 2, size: 52, rotate: -8 },
  { key: 'stomach', top: 49, left: 4, size: 48, rotate: -14, extra: true },
  { key: 'skeleton', top: 63, left: 2, size: 54, rotate: 8 },
  { key: 'intestines', top: 78, left: 4, size: 50, rotate: 16, extra: true },

  // Right edge.
  { key: 'eyeball', top: 19, left: 92, size: 48, rotate: -6, extra: true },
  { key: 'tooth', top: 34, left: 93, size: 40, rotate: 12 },
  { key: 'cardiology', top: 48, left: 91, size: 50, rotate: -4, extra: true },
  { key: 'blood', top: 63, left: 93, size: 40, rotate: -10 },
  { key: 'bone', top: 77, left: 91, size: 46, rotate: 28, extra: true },

  // Bottom edge.
  { key: 'pelvis', top: 90, left: 3, size: 50, rotate: 8 },
  { key: 'thermometer', top: 92, left: 17, size: 44, rotate: 22, extra: true },
  { key: 'scalpel', top: 90, left: 32, size: 44, rotate: -26 },
  { key: 'first aid', top: 92, left: 48, size: 46, rotate: 6, extra: true },
  { key: 'hand bones', top: 90, left: 63, size: 50, rotate: -12 },
  { key: 'liver', top: 92, left: 77, size: 52, rotate: 6, extra: true },
]

// Renders one backdrop icon from the shared medical icon set, drawn in the theme ink color.
// An unknown key renders nothing instead of crashing the page.
function ScatteredIcon({ icon }: { icon: BackdropIcon }) {
  const entry = MEDICAL_ICONS[icon.key]
  if (!entry) return null
  const { Icon } = entry
  return (
    <div
      className={icon.extra ? 'mbd-extra' : undefined}
      style={{
        position: 'absolute',
        top: `${icon.top}%`,
        left: `${icon.left}%`,
        width: icon.size,
        height: icon.size,
        transform: `rotate(${icon.rotate}deg)`,
        opacity: 'var(--blueprint-opacity)' as unknown as number,
      }}
    >
      <Icon color="currentColor" size={icon.size} />
    </div>
  )
}

// Subtle medical-blueprint layer behind the UI: anatomy icons scattered around the edges of the page.
// Static, non-interactive and rendered once; colors come from the --blueprint-* tokens in index.css.
export default function MedicalBackdrop() {
  return createPortal(
    <div
      aria-hidden="true"
      className="mbd-art"
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none',
        color: 'var(--blueprint-ink)', contain: 'paint',
      }}
    >
      <style>{BACKDROP_CSS}</style>
      {BACKDROP_ICONS.map(icon => <ScatteredIcon key={icon.key} icon={icon} />)}
    </div>,
    document.body,
  )
}
