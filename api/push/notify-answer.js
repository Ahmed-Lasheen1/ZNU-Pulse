// api/push/notify-answer.js
import { getAdminClient, sendToSubscriptions, safeHandler } from '../_lib/webpush.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Admin-only. The asker is found through the subscription linked at submit time,
// so the admin never sees who they are.
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = getAdminClient('notify-answer')
  if (!supabase) return res.status(500).json({ error: 'Server misconfiguration (missing SUPABASE_URL)' })

  const authToken = (req.headers.authorization || '').replace('Bearer ', '')
  if (!authToken) return res.status(401).json({ error: 'Missing auth token' })

  const { data: userData, error: userError } = await supabase.auth.getUser(authToken)
  if (userError || !userData?.user) return res.status(401).json({ error: 'Invalid session' })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single()
  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })

  const questionId = req.body?.question_id
  if (typeof questionId !== 'string' || !UUID_RE.test(questionId)) return res.status(400).json({ error: 'Invalid question_id' })

  const { data: claimed, error: claimError } = await supabase
    .from('anonymous_questions')
    .update({ answer_notified: true })
    .eq('id', questionId)
    .eq('answered', true)
    .eq('answer_notified', false)
    .not('notify_sub_id', 'is', null)
    .select('notify_sub_id')
  if (claimError) return res.status(500).json({ error: claimError.message })
  if (!claimed || claimed.length === 0) return res.status(200).json({ sent: 0 })

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('id', claimed[0].notify_sub_id)
  if (subsError) return res.status(500).json({ error: subsError.message })
  if (!subs || subs.length === 0) return res.status(200).json({ sent: 0 })

  const { sent } = await sendToSubscriptions(supabase, subs, {
    title: '💬 Pulse Check',
    body: 'Your question was answered!',
    url: '/pulse-check?tab=questions',
  })

  return res.status(200).json({ sent })
}

export default safeHandler(handler)
