import { getPulseTheme } from '../../premiumTheme'
import LiquidGlassCard from '../ui/liquid-glass-card'
import { OfflineIcon } from '../ui/tool-icons'
import { useOnlineStatus } from '../../lib/useOnlineStatus'

interface OfflineNoteProps {
  dark: boolean
  message?: string
  alwaysShow?: boolean
}

export default function OfflineNote({
  dark,
  message = "You're offline — showing your saved copy.",
  alwaysShow = false,
}: OfflineNoteProps) {
  const online = useOnlineStatus()
  if (!alwaysShow && online) return null

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
