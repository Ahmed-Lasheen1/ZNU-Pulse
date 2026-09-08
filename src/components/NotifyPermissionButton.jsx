// src/components/NotifyPermissionButton.jsx
import { useState, useEffect } from 'react'
import { getPulseTheme, ON_GRADIENT_TOP } from '../premiumTheme'
import { useToast } from './ToastProvider'
import { useNotificationStatus } from '../lib/useNotificationStatus'
import { subscribeToPush } from '../lib/pushNotifications'
import { useOncePerSession } from '../lib/useOncePerSession'
import { useLimitedAppearance } from '../lib/useLimitedAppearance'
import { BellIcon } from './ui/tool-icons'

// How many page loads this prompt gets to appear on before it retires
// for good — see the AUDIT FIX note below.
const MAX_PROMPT_SHOWS = 3

// Strips a leading emoji/symbol (and any trailing whitespace) off a
// label string — lets existing callers that still pass an
// emoji-prefixed label (e.g. "🔔 Enable reminders") keep working
// unchanged, now that the bell icon itself is rendered separately
// below instead of relying on that leading emoji character.
function stripLeadingEmoji(text) {
  return text.replace(/^[^\p{L}\p{N}]+/u, '').trim()
}

// Small reusable "Enable notifications" call-to-action button.
//
// Support/permission/subscription state comes from the shared
// useNotificationStatus hook — the same one the persistent toggle on
// the Profile page reads (see NotificationToggle.tsx) — so the two
// can never disagree about whether notifications are actually on for
// this device.
//
// AUDIT FIX (per user request): this used to render on every single
// reload for as long as notifications stayed off, which trained
// people to tune it out rather than act on it — annoying, especially
// since Profile's NotificationToggle is always available as a manual
// way in. The prompt now only shows on the first MAX_PROMPT_SHOWS page
// loads (see useLimitedAppearance) and then disappears permanently,
// regardless of whether the person ever tapped it. Enabling
// notifications (or a browser permission change) is unaffected — this
// only governs whether the *ask* itself keeps resurfacing.
//
// AUDIT FIX (still true): the "not supported" and "blocked" cases
// don't render inline explanatory text — both are a single toast,
// shown once per browser tab session (see useOncePerSession). The
// student can check or fix their notification setting any time from
// the toggle on the Profile page.
export default function NotifyPermissionButton({ dark, label = 'Enable notifications' }) {
  const pt = getPulseTheme(dark)
  const showToast = useToast()
  const { supported, permission, enabled, checked, refresh } = useNotificationStatus()
  const [busy, setBusy] = useState(false)

  const canToastUnsupported = useOncePerSession('znu_notif_unsupported_toast')
  const canToastDenied = useOncePerSession('znu_notif_denied_toast')

  // Everything that would make this button worth showing at all,
  // independent of the reload budget below — kept separate so the
  // budget is only ever spent on loads where the button actually had
  // something to say.
  const wouldShow = checked && supported && permission !== 'denied' && !enabled
  const allowedByBudget = useLimitedAppearance('znu_notif_prompt', wouldShow, MAX_PROMPT_SHOWS)

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
