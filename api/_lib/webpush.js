// api/_lib/webpush.js
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:admin@znu-future-doctors.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export { webpush }

export function getAdminClient(tag) {
  const url = process.env.SUPABASE_URL
  if (!url) {
    console.error(`[${tag}] Missing SUPABASE_URL environment variable.`)
    return null
  }
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function requireCronSecret(req, res) {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

// Sends one payload to a list of subscriptions, deleting any that
// come back 410/404 (uninstalled, cleared site data, etc).
export async function sendToSubscriptions(supabase, subs, payload) {
  let sent = 0
  const expiredIds = []
  await Promise.all((subs || []).map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
      sent++
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) expiredIds.push(sub.id)
    }
  }))
  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
  }
  return { sent, expiredIds }
}
