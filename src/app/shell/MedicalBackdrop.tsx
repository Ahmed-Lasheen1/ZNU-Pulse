import { createPortal } from 'react-dom'
import { MEDICAL_ICONS } from '@/shared/icons/medicalIcons'

// Keeps stroked icons at a constant thin line however much they are scaled (fill-style icons are unaffected).
const BACKDROP_CSS = `
  .mbd-art path, .mbd-art polyline, .mbd-art polygon, .mbd-art circle, .mbd-art rect { vector-effect: non-scaling-stroke; }
  @media (max-width: 640px) { .mbd-extra { display: none; } }
`

// One scattered icon: a MEDICAL_ICONS key, position in % of the viewport, size in px, rotation in degrees.
// `extra` icons are hidden on phones to keep small screens uncluttered.
interface BackdropIcon {
  key: string
  top: number
  left: number
  size: number
  rotate: number
  extra?: boolean
}

// Hand-placed on a loose grid with jitter, so the artwork spreads across the whole page instead of the corners.
const BACKDROP_ICONS: BackdropIcon[] = [
  { key: 'heart', top: 5, left: 4, size: 56, rotate: -12 },
  { key: 'brain', top: 4, left: 25, size: 52, rotate: 8, extra: true },
  { key: 'lung', top: 10, left: 47, size: 54, rotate: -6 },
  { key: 'dna strand', top: 5, left: 70, size: 50, rotate: 14, extra: true },
  { key: 'stethoscope', top: 9, left: 90, size: 48, rotate: -10 },

  { key: 'kidney', top: 28, left: 12, size: 46, rotate: 18, extra: true },
  { key: 'microscope', top: 24, left: 35, size: 56, rotate: -8 },
  { key: 'liver', top: 31, left: 60, size: 56, rotate: 6, extra: true },
  { key: 'shot', top: 27, left: 84, size: 46, rotate: -20 },

  { key: 'spine', top: 48, left: 3, size: 58, rotate: 10 },
  { key: 'stomach', top: 46, left: 25, size: 48, rotate: -14, extra: true },
  { key: 'thermometer', top: 51, left: 52, size: 44, rotate: 22, extra: true },
  { key: 'eyeball', top: 47, left: 76, size: 50, rotate: -6 },
  { key: 'tooth', top: 53, left: 93, size: 40, rotate: 12, extra: true },

  { key: 'skeleton', top: 68, left: 8, size: 54, rotate: -8 },
  { key: 'intestines', top: 70, left: 31, size: 52, rotate: 16, extra: true },
  { key: 'cardiology', top: 66, left: 55, size: 50, rotate: -4 },
  { key: 'bone', top: 72, left: 78, size: 46, rotate: 28, extra: true },
  { key: 'blood', top: 69, left: 93, size: 40, rotate: -10 },

  { key: 'pelvis', top: 88, left: 17, size: 50, rotate: 8 },
  { key: 'scalpel', top: 90, left: 41, size: 44, rotate: -26, extra: true },
  { key: 'pharmacy', top: 87, left: 64, size: 48, rotate: 10 },
  { key: 'hand bones', top: 90, left: 86, size: 52, rotate: -12, extra: true },
]

// Renders one backdrop icon from the shared medical icon set, drawn in the theme ink color.
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

// Subtle medical-blueprint layer behind the UI: anatomy icons scattered across the page.
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
