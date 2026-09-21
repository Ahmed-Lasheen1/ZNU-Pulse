// api/push/weekly-report.js
import { getAdminClient, sendToSubscriptions, requireCronSecret, fetchAllRows } from '../_lib/webpush'

// Weekly cron. Only signed-in users get a report (guest stats live in their browser).
export default async function handler(req, res) {
  if (!requireCronSecret(req, res)) return

  const supabase = getAdminClient('weekly-report')
  if (!supabase) return res.status(500).json({ error: 'Server misconfiguration (missing SUPABASE_URL)' })

  const { data: subs, error: subsError } = await fetchAllRows(() =>
    supabase.from('push_subscriptions').select('*').not('user_id', 'is', null).order('id')
  )
  if (subsError) return res.status(500).json({ error: subsError.message })
  if (!subs || subs.length === 0) return res.status(200).json({ sent: 0 })

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const byUser = {}
  subs.forEach((s) => { (byUser[s.user_id] ||= []).push(s) })
  const userIds = Object.keys(byUser)

  // Filtered per user in memory: a huge .in() list would overflow the URL length.
  const { data: allHistory, error: historyError } = await fetchAllRows(() =>
    supabase.from('exam_history').select('id, user_id, total, correct').gte('completed_at', weekAgo).order('id')
  )
  if (historyError) return res.status(500).json({ error: historyError.message })

  const historyByUser = {}
  ;(allHistory || []).forEach(h => {
    if (byUser[h.user_id]) (historyByUser[h.user_id] ||= []).push(h)
  })

  let sent = 0

  await Promise.all(userIds.map(async (userId) => {
    const history = historyByUser[userId]
    if (!history || history.length === 0) return

    const totalAttempted = history.reduce((a, h) => a + h.total, 0)
    const totalCorrect = history.reduce((a, h) => a + h.correct, 0)
    const accuracy = totalAttempted > 0 ? Math.round((100 * totalCorrect) / totalAttempted) : 0

    // Tiers match accuracyTier() in mcqShared.tsx.
    const encouragement =
      accuracy >= 90 ? 'Outstanding work! 🌟' :
      accuracy >= 75 ? 'Great work! 👏' :
      accuracy >= 65 ? 'Keep it up! 💪' :
      accuracy >= 50 ? "Keep practicing — you'll get there! 📚" :
                        "Don't give up — every question helps you learn! 🔄"

    const body = `You answered ${totalAttempted} questions this week at ${accuracy}% accuracy. ${encouragement}`
    const { sent: userSent } = await sendToSubscriptions(supabase, byUser[userId], { title: '📈 Your Weekly Report', body, url: '/' })
    sent += userSent
  }))

  return res.status(200).json({ sent })
}
