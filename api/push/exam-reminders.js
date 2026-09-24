// api/push/exam-reminders.js
import { getAdminClient, sendToSubscriptions, requireCronSecret, fetchAllRows, safeHandler } from '../_lib/webpush'

// Daily cron (.github/workflows/exam-reminders-push.yml).
async function handler(req, res) {
  if (!requireCronSecret(req, res)) return

  const supabase = getAdminClient('exam-reminders')
  if (!supabase) return res.status(500).json({ error: 'Server misconfiguration (missing SUPABASE_URL)' })

  const { data: schedules, error: schedulesError } = await supabase
    .from('schedules')
    .select('title, dates, module_id, modules(name)')
    .eq('type', 'exam')
    .not('dates', 'is', null)
  if (schedulesError) return res.status(500).json({ error: 'schedules query: ' + schedulesError.message })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = (schedules || []).filter((s) =>
    (s.dates || []).some((d) => {
      const diffDays = Math.round((new Date(d) - today) / (24 * 60 * 60 * 1000))
      return diffDays >= 0 && diffDays <= 2
    })
  )

  if (upcoming.length === 0) return res.status(200).json({ sent: 0, reason: 'no upcoming exams' })

  const body = upcoming.map((s) => `${s.modules?.name || ''} — ${s.title}`.trim()).join(', ')
  const { data: subs, error: subsError } = await fetchAllRows(() =>
    supabase.from('push_subscriptions').select('*').order('id')
  )
  if (subsError) return res.status(500).json({ error: 'push_subscriptions query: ' + subsError.message })

  const { sent } = await sendToSubscriptions(supabase, subs, { title: '📝 Upcoming Exam', body, url: '/schedule' })

  return res.status(200).json({ sent, upcomingCount: upcoming.length })
}

export default safeHandler(handler)
