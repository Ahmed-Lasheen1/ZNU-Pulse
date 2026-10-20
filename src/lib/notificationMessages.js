export const NOTIFICATION_MESSAGES = {
  unsupported: "Can't enable notifications here. Add the site to your Home Screen (browser menu or Share → Add to Home Screen).",
  blocked: "Notifications are blocked for this site. Allow them in your browser's site settings, then reload.",
  notGranted: 'No problem — you can turn notifications on any time later.',
}

const SUBSCRIBE_ERRORS = {
  unsupported: '❌ This browser does not support push notifications',
  missing_vapid_key: '❌ Server misconfiguration (missing VAPID key) — contact admin',
  db_insert_failed: '❌ Could not save your subscription — try again later',
  subscribe_exception: '❌ Could not enable notifications on this device',
}

export function subscribeErrorMessage(reason) {
  return SUBSCRIBE_ERRORS[reason] || '❌ Could not enable notifications'
}
