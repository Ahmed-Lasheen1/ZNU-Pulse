import { useState } from 'react'
import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import { useNotificationStatus } from '@/features/notifications/useNotificationStatus'
import { subscribeToPush, unsubscribeFromPush } from '@/services/notifications/pushNotifications'
import { NOTIFICATION_MESSAGES, subscribeErrorMessage } from '@/services/notifications/notificationMessages'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import PulseSwitch from '@/shared/ui/controls/pulse-switch'
import { BellIcon } from '@/shared/icons/tool-icons'

export default function NotificationToggle({ dark, switchSize = 1 }: { dark: boolean; switchSize?: number }) {
  const pt = getPulseTheme(dark)
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void
  const { supported, permission, enabled, checked, refresh } = useNotificationStatus()
  const [busy, setBusy] = useState(false)

  if (!checked) return null

  async function handleToggle() {
    if (busy) return
    setBusy(true)

    if (!supported) {
      setBusy(false)
      showToast(NOTIFICATION_MESSAGES.unsupported, 'info')
      return
    }

    if (enabled) {
      const result = await unsubscribeFromPush()
      setBusy(false)
      await refresh()
      showToast(result.success ? '🔕 Notifications turned off' : '❌ Could not turn off notifications — try again', result.success ? 'success' : 'error')
      return
    }

    if (permission === 'denied') {
      setBusy(false)
      showToast(NOTIFICATION_MESSAGES.blocked, 'info')
      return
    }

    let perm = permission
    if (perm === 'default') perm = await Notification.requestPermission()

    if (perm !== 'granted') {
      setBusy(false)
      showToast(perm === 'denied' ? NOTIFICATION_MESSAGES.blocked : NOTIFICATION_MESSAGES.notGranted, 'info')
      await refresh()
      return
    }

    const result = await subscribeToPush()
    setBusy(false)
    await refresh()

    if (result.success) { showToast('✅ Notifications enabled!'); return }

    showToast(subscribeErrorMessage(result.reason as string), 'error')
  }

  return (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...pulseType.cardTitle, color: pt.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BellIcon color={pt.textPrimary} size={15} /> Push Notifications
          </div>
          <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>
            {!supported
              ? 'Not supported in this browser'
              : permission === 'denied'
                ? 'Blocked — change this in your browser settings'
                : enabled
                  ? 'Exam & deadline reminders are on'
                  : 'Get exam and deadline reminders'}
          </div>
        </div>
        <PulseSwitch
          on={enabled}
          onClick={handleToggle}
          disabled={busy || !supported}
          dark={dark}
          size={switchSize}
          ariaLabel={enabled ? 'Turn off notifications' : 'Turn on notifications'}
        />
      </div>
    </LiquidGlassCard>
  )
}
