import { getPulseTheme } from '../../premiumTheme'
import LiquidGlassCard from '../ui/liquid-glass-card'
import { OfflineIcon } from '../ui/tool-icons'

export default function OfflineNote({ dark, message = 'Showing your last saved copy.' }: { dark: boolean; message?: string }) {
  const pt = getPulseTheme(dark)
  return (
    <div style={{ marginBottom: 16 }}>
      <LiquidGlassCard dark={dark} delay={0} style={{ padding: '10px 16px', textAlign: 'center' }}>
        <span style={{ color: pt.amber, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <OfflineIcon color={pt.amber} size={14} /> {message}
        </span>
      </LiquidGlassCard>
    </div>
  )
}
