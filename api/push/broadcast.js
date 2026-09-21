// api/push/broadcast.js
import { getAdminClient, sendToSubscriptions, fetchAllRows } from '../_lib/webpush'

// Admin-triggered broadcast. Auth is a signed-in Supabase token whose profile has role='admin'.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = getAdminClient('broadcast')
  if (!supabase) return res.status(500).json({ error: 'Server misconfiguration (missing SUPABASE_URL)' })

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return res.status(401).json({ error: 'Invalid session' })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single()
  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })

  const { title, body, url } = req.body || {}
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' })

  const { data: subs, error: subsError } = await fetchAllRows(() =>
    supabase.from('push_subscriptions').select('*').order('id')
  )
  if (subsError) return res.status(500).json({ error: subsError.message })
  if (!subs || subs.length === 0) return res.status(200).json({ sent: 0, total: 0 })

  const { sent } = await sendToSubscriptions(supabase, subs, { title, body, url: url || '/' })
  return res.status(200).json({ sent, total: subs.length })
}
