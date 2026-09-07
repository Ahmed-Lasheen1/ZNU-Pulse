import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// See api/push/broadcast.js for why this now comes from the
// environment instead of a hardcoded literal.
const SUPABASE_URL = process.env.SUPABASE_URL

webpush.setVapidDetails(
  'mailto:admin@znu-future-doctors.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Triggered weekly by a GitHub Actions cron job (see
// .github/workflows/weekly-report-push.yml). Only signed-in users get
// a personalized report — guest devices have no server-side history
// to summarize (their stats live only in their own browser).
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
  let sent = 0
  const expiredIds = []

  // Group by user first — someone subscribed on two devices should
  // only get their stats computed once.
  const byUser = {}
  subs.forEach((s) => { (byUser[s.user_id] ||= []).push(s) })

  await Promise.all(Object.entries(byUser).map(async ([userId, userSubs]) => {
    const { data: history } = await supabase
      .from('exam_history')
      .select('total, correct')
      .eq('user_id', userId)
      .gte('completed_at', weekAgo)

    if (!history || history.length === 0) return // nothing to report this week

    const totalAttempted = history.reduce((a, h) => a + h.total, 0)
    const totalCorrect = history.reduce((a, h) => a + h.correct, 0)
    const accuracy = totalAttempted > 0 ? Math.round((100 * totalCorrect) / totalAttempted) : 0

    // Message tone scales with how the student actually did this
    // week. Tiers (90/75/65/50) match the same breakpoints used by
    // the in-app Weekly Report card on Home and the MCQ results
    // screen — see accuracyTier() in src/pages/mcq/mcqShared.tsx —
    // so the push notification and the app never disagree.
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
