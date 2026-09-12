// src/components/NotifyPermissionButton.jsx
import { useState, useEffect } from 'react'
import { getPulseTheme, ON_GRADIENT_TOP } from '../premiumTheme'
import { useToast } from './ToastProvider'
import { useNotificationStatus } from '../lib/useNotificationStatus'
import { subscribeToPush } from '../lib/pushNotifications'
import { useOncePerSession } from '../lib/useOncePerSession'
import { useLimitedAppearance } from '../lib/useLimitedAppearance'
import { BellIcon } from './ui/tool-icons'

// Max page loads this prompt shows before retiring permanently for this device.
const MAX_PROMPT_SHOWS = 3

// Strips a leading emoji/symbol from a label (e.g. "🔔 Enable reminders")
// since the bell icon is now rendered separately from the text.
function stripLeadingEmoji(text) {
  return text.replace(/^[^\p{L}\p{N}]+/u, '').trim()
}

// "Enable notifications" call-to-action button. Shares status with
// NotificationToggle.tsx (Profile page) via useNotificationStatus so the
// two never disagree about whether push is actually on for this device.
// The prompt itself only appears for the first MAX_PROMPT_SHOWS page loads
// (see useLimitedAppearance), then disappears for good regardless of
// whether it was ever tapped — Profile's toggle remains available always.
export default function NotifyPermissionButton({ dark, label = 'Enable notifications' }) {
  const pt = getPulseTheme(dark)
  const showToast = useToast()
  const { supported, permission, enabled, checked, refresh } = useNotificationStatus()
  const [busy, setBusy] = useState(false)

  const canToastUnsupported = useOncePerSession('znu_notif_unsupported_toast')
  const canToastDenied = useOncePerSession('znu_notif_denied_toast')

  // Whether this button has anything worth showing, independent of the
  // reload budget — so the budget is only ever spent on loads where it
  // actually had something to say.
  const wouldShow = checked && supported && permission !== 'denied' && !enabled
  const allowedByBudget = useLimitedAppearance('znu_notif_prompt', wouldShow, MAX_PROMPT_SHOWS)

  // "Not supported" and "blocked" states surface as a one-time toast per
  // tab session rather than persistent inline text.
  useEffect(() => {
    if (!checked || !canToastUnsupported) return
    if (!supported) {
      showToast("🔕 Notifications aren't supported in this browser. On iPhone, add this site to your Home Screen first (Share → Add to Home Screen), then open it from there.", 'error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, supported])

  useEffect(() => {
    if (!checked || !canToastDenied) return
    if (supported && permission === 'denied') {
      showToast("🔕 Notifications are blocked for this site. Enable them from your browser's site settings, then reload the page.", 'error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, supported, permission])

  async function handleClick() {
    setBusy(true)
    let perm = permission
    if (perm === 'default') {
      perm = await Notification.requestPermission()
    }

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

    if (result.success) {
      showToast('✅ Notifications enabled!')
      return
    }

    const messages = {
      unsupported: '❌ This browser does not support push notifications',
      missing_vapid_key: '❌ Server misconfiguration (missing VAPID key) — contact admin',
      db_insert_failed: '❌ Could not save your subscription — try again later',
      subscribe_exception: '❌ Could not enable notifications on this device',
    }
    showToast(messages[result.reason] || '❌ Could not enable notifications', 'error')
  }

  if (!wouldShow || !allowedByBudget) return null

  return (
    <button onClick={handleClick} disabled={busy} style={{
      background: 'transparent', border: `1px solid ${pt.border}`, borderRadius: 20,
      padding: '6px 16px', color: ON_GRADIENT_TOP.secondary, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 auto 16px',
      opacity: busy ? 0.6 : 1
    }}>
      <BellIcon color={ON_GRADIENT_TOP.secondary} size={13} />
      {busy ? 'Enabling...' : (permission === 'granted' ? 'Finish enabling notifications' : stripLeadingEmoji(label))}
    </button>
  )
}
