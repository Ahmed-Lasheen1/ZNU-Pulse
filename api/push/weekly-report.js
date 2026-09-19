import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const SUPABASE_URL = process.env.SUPABASE_URL

webpush.setVapidDetails(
  'mailto:admin@znu-future-doctors.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Runs weekly via cron. Only signed-in users get a report — guest
// stats live only in their own browser.
export default async function handler(req, res) {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!SUPABASE_URL) {
    console.error('[weekly-report] Missing SUPABASE_URL environment variable.')
    return res.status(500).json({ error: 'Server misconfiguration (missing SUPABASE_URL)' })
  }

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: subs } = await supabase.from('push_subscriptions').select('*').not('user_id', 'is', null)
  if (!subs || subs.length === 0) return res.status(200).json({ sent: 0 })

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Group subs by user first — someone with two devices only gets one report.
  const byUser = {}
  subs.forEach((s) => { (byUser[s.user_id] ||= []).push(s) })
  const userIds = Object.keys(byUser)

  // One batched query for every user's history instead of one query per user.
  const { data: allHistory } = await supabase
    .from('exam_history')
    .select('user_id, total, correct')
    .in('user_id', userIds)
    .gte('completed_at', weekAgo)

  const historyByUser = {}
  ;(allHistory || []).forEach(h => { (historyByUser[h.user_id] ||= []).push(h) })

  let sent = 0
  const expiredIds = []

  await Promise.all(userIds.map(async (userId) => {
    const history = historyByUser[userId]
    if (!history || history.length === 0) return // nothing to report this week

    const userSubs = byUser[userId]
    const totalAttempted = history.reduce((a, h) => a + h.total, 0)
    const totalCorrect = history.reduce((a, h) => a + h.correct, 0)
    const accuracy = totalAttempted > 0 ? Math.round((100 * totalCorrect) / totalAttempted) : 0

    // Tiers match accuracyTier() in mcqShared.tsx, so the app and this push agree.
    const encouragement =
      accuracy >= 90 ? 'Outstanding work! 🌟' :
      accuracy >= 75 ? 'Great work! 👏' :
      accuracy >= 65 ? 'Keep it up! 💪' :
      accuracy >= 50 ? "Keep practicing — you'll get there! 📚" :
                        "Don't give up — every question helps you learn! 🔄"

    const body = `You answered ${totalAttempted} questions this week at ${accuracy}% accuracy. ${encouragement}`

    await Promise.all(userSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: '📈 Your Weekly Report', body, url: '/' })
        )
        sent++
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) expiredIds.push(sub.id)
      }
    }))
  }))

  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
  }

  return res.status(200).json({ sent })
}
