// api/push/notify-admins.js
import { getAdminClient, sendToSubscriptions, fetchAllRows, safeHandler } from '../_lib/webpush.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PREVIEW_MAX = 120

// Public but proof-gated: the caller must hold the tracking token of a fresh,
// not-yet-announced question, and each token can trigger this only once.
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.body?.token
  if (typeof token !== 'string' || !UUID_RE.test(token)) return res.status(400).json({ error: 'Invalid token' })

  const supabase = getAdminClient('notify-admins')
  if (!supabase) return res.status(500).json({ error: 'Server misconfiguration (missing SUPABASE_URL)' })

  const { data: question, error: claimError } = await supabase.rpc('claim_admin_notification', { p_token: token })
  if (claimError) return res.status(500).json({ error: claimError.message })
  if (!question) return res.status(200).json({ sent: 0 })

  const { data: admins, error: adminsError } = await supabase.from('profiles').select('id').eq('role', 'admin')
  if (adminsError) return res.status(500).json({ error: adminsError.message })
  const adminIds = (admins || []).map((a) => a.id)
  if (adminIds.length === 0) return res.status(200).json({ sent: 0 })

  const { data: subs, error: subsError } = await fetchAllRows(() =>
    supabase.from('push_subscriptions').select('*').in('user_id', adminIds).order('id')
  )
  if (subsError) return res.status(500).json({ error: subsError.message })
  if (!subs || subs.length === 0) return res.status(200).json({ sent: 0 })

  const body = question.length > PREVIEW_MAX ? `${question.slice(0, PREVIEW_MAX - 1)}…` : question
  const { sent } = await sendToSubscriptions(supabase, subs, {
    title: '📥 New Pulse Check message',
    body,
    url: '/pulse-check?tab=questions',
  })

  return res.status(200).json({ sent })
}

export default safeHandler(handler)
