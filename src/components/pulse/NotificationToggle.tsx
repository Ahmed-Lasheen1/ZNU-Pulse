import { useState } from 'react'
import { getPulseTheme, pulseType } from '../../premiumTheme'
import { useToast } from '../ToastProvider'
import { useNotificationStatus } from '../../lib/useNotificationStatus'
import { subscribeToPush, unsubscribeFromPush } from '../../lib/pushNotifications'
import LiquidGlassCard from '../ui/liquid-glass-card'
import PulseSwitch from '../ui/pulse-switch'
import { BellIcon } from '../ui/tool-icons'

// Persistent on/off control for push notifications, shown on the
// Profile page — the counterpart to NotifyPermissionButton's one-shot
// call-to-action banner (Home/Checklist/AnonQuestions). Both read the
// same shared status (see useNotificationStatus) so they never
// disagree about whether notifications are actually on.
//
// `size` scales the whole card (padding, text, icon, and the switch
// itself via PulseSwitch's own `size` prop) — defaults to 1 (the
// original size) so every other place this is used is unaffected;
// Profile.tsx now passes a larger value to make this control easier
// to see/tap.
//
// A browser can only be un-blocked by the person themselves, from
// their own browser's site settings — no page can do that
// programmatically. When permission is 'denied', the switch renders
// off and disabled; tapping it explains that via a toast instead of
// silently doing nothing.
export default function NotificationToggle({ dark, size = 1 }: { dark: boolean; size?: number }) {
  const pt = getPulseTheme(dark)
  const showToast = useToast() as (message: string, type?: 'success' | 'error') => void
  const { supported, permission, enabled, checked, refresh } = useNotificationStatus()
  const [busy, setBusy] = useState(false)

  if (!checked) return null

  async function handleToggle() {
    if (busy) return

    if (!supported) {
      showToast("🔕 Notifications aren't supported in this browser. On iPhone, add this site to your Home Screen first (Share → Add to Home Screen), then open it from there.", 'error')
      return
    }

    if (enabled) {
      setBusy(true)
      const result = await unsubscribeFromPush()
      setBusy(false)
      await refresh()
      showToast(result.success ? '🔕 Notifications turned off' : '❌ Could not turn off notifications — try again', result.success ? 'success' : 'error')
      return
    }

    if (permission === 'denied') {
      showToast("🔕 Notifications are blocked for this site. Enable them from your browser's site settings, then reload the page.", 'error')
      return
    }

    setBusy(true)
    let perm = permission
    if (perm === 'default') perm = await Notification.requestPermission()

    if (perm !== 'granted') {
      setBusy(false)
      showToast(perm === 'denied'
        ? "🔕 Notifications are blocked for this site. Enable them from your browser's site settings, then reload the page."
        : '🔕 Notifications permission was not granted', 'error')
      await refresh()
      return
    }

    const result = await subscribeToPush()
    setBusy(false)
    await refresh()

    if (result.success) { showToast('✅ Notifications enabled!'); return }

    const messages: Record<string, string> = {
      unsupported: '❌ This browser does not support push notifications',
      missing_vapid_key: '❌ Server misconfiguration (missing VAPID key) — contact admin',
      db_insert_failed: '❌ Could not save your subscription — try again later',
      subscribe_exception: '❌ Could not enable notifications on this device',
    }
    showToast(messages[result.reason as string] || '❌ Could not enable notifications', 'error')
  }

  return (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: `${16 * size}px ${20 * size}px` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 * size }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...pulseType.cardTitle, fontSize: 15 * size, color: pt.textPrimary, display: 'flex', alignItems: 'center', gap: 6 * size }}>
            <BellIcon color={pt.textPrimary} size={15 * size} /> Push Notifications
          </div>
          <div style={{ ...pulseType.small, fontSize: 12.5 * size, color: pt.textMuted, marginTop: 2 * size }}>
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
          size={size}
          ariaLabel={enabled ? 'Turn off notifications' : 'Turn on notifications'}
        />
      </div>
    </LiquidGlassCard>
  )
}
