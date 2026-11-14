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

// Hand-placed with uneven spacing, sizes and rotations so it feels scattered. Most icons sit in a band along the
// four edges; a smaller group is spread through the interior. Each key is used once, because the icons define
// their own clipPath ids.
const BACKDROP_ICONS: BackdropIcon[] = [
  // Top band.
  { key: 'heart', top: 2, left: 3, size: 58, rotate: -14 },
  { key: 'brain', top: 7, left: 12, size: 46, rotate: 9, extra: true },
  { key: 'lung', top: 1, left: 22, size: 52, rotate: -7 },
  { key: 'microscope', top: 10, left: 29, size: 40, rotate: 16, extra: true },
  { key: 'dna strand', top: 3, left: 38, size: 48, rotate: 12 },
  { key: 'stethoscope', top: 11, left: 46, size: 44, rotate: -12, extra: true },
  { key: 'genome', top: 2, left: 56, size: 42, rotate: 20 },
  { key: 'thermometer', top: 9, left: 64, size: 38, rotate: -24, extra: true },
  { key: 'shot', top: 4, left: 73, size: 46, rotate: -18 },
  { key: 'eyeball', top: 12, left: 81, size: 40, rotate: 8, extra: true },
  { key: 'bandaid', top: 1, left: 89, size: 44, rotate: 26 },

  // Left band.
  { key: 'kidney', top: 18, left: 6, size: 48, rotate: 18, extra: true },
  { key: 'neurology', top: 25, left: 1, size: 54, rotate: -8 },
  { key: 'stomach', top: 33, left: 10, size: 42, rotate: -16, extra: true },
  { key: 'skeleton', top: 41, left: 3, size: 58, rotate: 8 },
  { key: 'bladder', top: 49, left: 13, size: 38, rotate: 22, extra: true },
  { key: 'intestines', top: 57, left: 2, size: 50, rotate: 14 },
  { key: 'orthopedics', top: 65, left: 9, size: 44, rotate: -10, extra: true },
  { key: 'sonogram', top: 73, left: 3, size: 46, rotate: 12 },
  { key: 'female', top: 80, left: 12, size: 40, rotate: -20, extra: true },

  // Right band.
  { key: 'tooth', top: 17, left: 92, size: 40, rotate: 12, extra: true },
  { key: 'cardiology', top: 23, left: 85, size: 52, rotate: -5 },
  { key: 'blood', top: 31, left: 94, size: 38, rotate: -12 },
  { key: 'bone', top: 39, left: 87, size: 46, rotate: 28, extra: true },
  { key: 'vein', top: 47, left: 95, size: 44, rotate: 14 },
  { key: 'hearing aid', top: 55, left: 84, size: 42, rotate: -18, extra: true },
  { key: 'liver', top: 62, left: 92, size: 54, rotate: 6 },
  { key: 'defibrillator', top: 70, left: 86, size: 44, rotate: -10, extra: true },
  { key: 'nephrology', top: 77, left: 95, size: 46, rotate: 18 },
  { key: 'urology', top: 82, left: 84, size: 40, rotate: -14, extra: true },

  // Bottom band.
  { key: 'pelvis', top: 90, left: 2, size: 50, rotate: 8 },
  { key: 'glasses', top: 85, left: 11, size: 40, rotate: -12, extra: true },
  { key: 'scalpel', top: 93, left: 19, size: 42, rotate: -26 },
  { key: 'first aid', top: 86, left: 27, size: 44, rotate: 6, extra: true },
  { key: 'hand bones', top: 92, left: 35, size: 52, rotate: -12 },
  { key: 'pulse oximeter', top: 87, left: 44, size: 42, rotate: 16, extra: true },
  { key: 'medical bag', top: 94, left: 52, size: 46, rotate: -6 },
  { key: 'ultrasound wand', top: 86, left: 60, size: 44, rotate: 22, extra: true },
  { key: 'emergency care', top: 92, left: 68, size: 44, rotate: -14 },
  { key: 'internal medicine', top: 85, left: 76, size: 46, rotate: 10, extra: true },
  { key: 'surgery', top: 94, left: 84, size: 42, rotate: -22 },

  // Interior (scattered through the middle of the page).
  { key: 'ear nose and throat', top: 21, left: 24, size: 44, rotate: 14, extra: true },
  { key: 'large intestine', top: 19, left: 51, size: 42, rotate: -10 },
  { key: 'otoscope', top: 27, left: 70, size: 40, rotate: 24, extra: true },
  { key: 'uterus', top: 36, left: 33, size: 44, rotate: -18 },
  { key: 'heart rate up', top: 42, left: 58, size: 46, rotate: 8, extra: true },
  { key: 'nose', top: 33, left: 78, size: 38, rotate: -14 },
  { key: 'gastroenterology', top: 50, left: 24, size: 48, rotate: 20, extra: true },
  { key: 'dermatology', top: 55, left: 46, size: 40, rotate: -6 },
  { key: 'infant', top: 48, left: 72, size: 42, rotate: 16, extra: true },
  { key: 'hair', top: 63, left: 31, size: 38, rotate: -22 },
  { key: 'hospital building', top: 68, left: 55, size: 46, rotate: 6, extra: true },
  { key: 'family medicine', top: 61, left: 74, size: 44, rotate: -12 },
  { key: 'natural medicine', top: 75, left: 22, size: 40, rotate: 18, extra: true },
  { key: 'pediatrics', top: 76, left: 44, size: 44, rotate: -8 },
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

// Subtle medical-blueprint layer behind the UI: anatomy icons scattered across the page, denser toward the edges.
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
