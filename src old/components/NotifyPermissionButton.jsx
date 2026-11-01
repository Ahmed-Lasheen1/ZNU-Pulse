import { useState, useEffect } from 'react'
import { getPulseTheme, ON_GRADIENT_TOP } from '../premiumTheme'
import { useToast } from './ToastProvider'
import { useNotificationStatus } from '../lib/useNotificationStatus'
import { subscribeToPush } from '../lib/pushNotifications'
import { useOncePerSession } from '../lib/useOncePerSession'
import { useLimitedAppearance } from '../lib/useLimitedAppearance'
import { NOTIFICATION_MESSAGES, subscribeErrorMessage } from '../lib/notificationMessages'
import { BellIcon } from './ui/tool-icons'

const MAX_PROMPT_SHOWS = 3

function stripLeadingEmoji(text) {
  return text.replace(/^[^\p{L}\p{N}]+/u, '').trim()
}

export default function NotifyPermissionButton({ dark, label = 'Enable notifications' }) {
  const pt = getPulseTheme(dark)
  const showToast = useToast()
  const { supported, permission, enabled, checked, refresh } = useNotificationStatus()
  const [busy, setBusy] = useState(false)

  const canToastUnsupported = useOncePerSession('znu_notif_unsupported_toast')
  const canToastDenied = useOncePerSession('znu_notif_denied_toast')

  const wouldShow = checked && supported && permission !== 'denied' && !enabled
  const allowedByBudget = useLimitedAppearance('znu_notif_prompt', wouldShow, MAX_PROMPT_SHOWS)

  useEffect(() => {
    if (!checked || !canToastUnsupported) return
    if (!supported) showToast(NOTIFICATION_MESSAGES.unsupported, 'info')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, supported])

  useEffect(() => {
    if (!checked || !canToastDenied) return
    if (supported && permission === 'denied') showToast(NOTIFICATION_MESSAGES.blocked, 'info')
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
      showToast(perm === 'denied' ? NOTIFICATION_MESSAGES.blocked : NOTIFICATION_MESSAGES.notGranted, 'info')
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

    showToast(subscribeErrorMessage(result.reason), 'error')
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
