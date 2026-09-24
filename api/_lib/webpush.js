// api/_lib/webpush.js
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export { webpush }

const SEND_TIMEOUT_MS = 10000
const SEND_BATCH_SIZE = 50
const AR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

// Set up on first use instead of at import time, so a missing/invalid
// VAPID key produces a readable error instead of crashing the function.
let vapidReady = false
function ensureVapid() {
  if (vapidReady) return
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    throw new Error('Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY environment variable')
  }
  webpush.setVapidDetails(
    'mailto:admin@znu-future-doctors.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  vapidReady = true
}

// Wraps a handler so any unexpected crash returns the real message as JSON
// (visible in the GitHub Actions log) instead of a blank 500.
export function safeHandler(fn) {
  return async (req, res) => {
    try {
      return await fn(req, res)
    } catch (err) {
      console.error('[api] Unhandled error:', err)
      if (!res.headersSent) res.status(500).json({ error: err?.message || String(err) })
    }
  }
}

export function getAdminClient(tag) {
  const url = process.env.SUPABASE_URL
  if (!url) {
    console.error(`[${tag}] Missing SUPABASE_URL environment variable.`)
    return null
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Fails closed: a missing CRON_SECRET rejects every request.
export function requireCronSecret(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return false
  }
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers['x-cron-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

// Pages past PostgREST's 1000-row cap. makeQuery must return a fresh, ordered query.
export async function fetchAllRows(makeQuery, pageSize = 1000) {
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1)
    if (error) return { data: null, error }
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return { data: rows, error: null }
}

// Sends one payload to many subscriptions, deleting any that return 410/404.
export async function sendToSubscriptions(supabase, subs, payload) {
  ensureVapid()

  let sent = 0
  const expiredIds = []
  const list = subs || []
  const lang = AR_RE.test(`${payload.title} ${payload.body}`) ? 'ar' : 'en'
  const body = JSON.stringify({ ...payload, lang })

  for (let i = 0; i < list.length; i += SEND_BATCH_SIZE) {
    await Promise.all(list.slice(i, i + SEND_BATCH_SIZE).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { timeout: SEND_TIMEOUT_MS }
        )
        sent++
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) expiredIds.push(sub.id)
        else console.warn('[webpush] send failed:', err.statusCode || err.message)
      }
    }))
  }

  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
  }
  return { sent, expiredIds }
}
