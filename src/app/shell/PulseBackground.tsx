import KineticGrid from '@/shared/ui/motion/kinetic-grid'
import MedicalBackdrop from '@/app/shell/MedicalBackdrop'

// Background layers drawn over the flat page color: the static medical backdrop, then the interactive grid.
// The page background color itself comes from the html element (see src/styles/index.css), so every page shares it.
// Pass `interactive={false}` to turn the layers off.
export default function PulseBackground({ dark, interactive = true }: { dark: boolean; interactive?: boolean }) {
  if (!interactive) return null
  return (
    <>
      <MedicalBackdrop />
      <KineticGrid overlay dark={dark} opacity={0.75} />
    </>
  )
}
