import KineticGrid from '@/shared/ui/motion/kinetic-grid'

// Interactive grid texture drawn over the flat page background. The background color itself comes from the
// html element (see src/styles/index.css), so every page shares it without redefining anything.
// Pass `interactive={false}` to turn the grid off.
export default function PulseBackground({ dark, interactive = true }: { dark: boolean; interactive?: boolean }) {
  if (!interactive) return null
  return <KineticGrid overlay dark={dark} opacity={0.75} />
}
