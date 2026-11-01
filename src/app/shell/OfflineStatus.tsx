import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus'
import { useAttemptSync } from '@/services/offline/useAttemptSync'
import { useChecklistSync } from '@/services/offline/useChecklistSync'
import { pulseType, ON_GRADIENT_TOP } from '@/shared/theme/premiumTheme'
import { OfflineIcon } from '@/shared/icons/tool-icons'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'

export default function OfflineStatus({ dark }: { dark: boolean }) {
  const online = useOnlineStatus()
  useAttemptSync()
  useChecklistSync()
  if (online) return null

  return (
    <div
      role="status"
      style={{
        position: 'fixed', top: 'calc(60px + env(safe-area-inset-top, 0px))', left: '50%',
        transform: 'translateX(-50%)', zIndex: 600, pointerEvents: 'none',
      }}
    >
      <PulseGlassRow dark={dark} radius={999}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '3px 12px',
          ...pulseType.small, fontSize: 11, fontWeight: 700, color: ON_GRADIENT_TOP.primary,
        }}>
          <OfflineIcon color={ON_GRADIENT_TOP.primary} size={12} /> Offline
        </div>
      </PulseGlassRow>
    </div>
  )
}
