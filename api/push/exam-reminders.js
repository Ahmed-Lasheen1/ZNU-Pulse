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

// Triggered daily by a GitHub Actions cron job (see
// .github/workflows/exam-reminders-push.yml). Not user-facing — auth
// is a shared secret header, not a login.
export default async function handler(req, res) {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!SUPABASE_URL) {
    console.error('[exam-reminders] Missing SUPABASE_URL environment variable.')
    return res.status(500).json({ error: 'Server misconfiguration (missing SUPABASE_URL)' })
  }

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // AUDIT FIX (multi-date support): an exam schedule item can now
  // carry more than one date (see the schedules_add_dates_array
  // migration and admin/SchedulesTab.tsx) — a schedule matches the
  // reminder window if ANY of its dates falls within it, not just a
  // single `date` column.
  const { data: schedules } = await supabase
    .from('schedules')
    .select('title, dates, module_id, modules(name)')
    .eq('type', 'exam')
    .not('dates', 'is', null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = (schedules || []).filter((s) => {
    return (s.dates || []).some((d) => {
      const diffDays = Math.round((new Date(d) - today) / (24 * 60 * 60 * 1000))
      return diffDays >= 0 && diffDays <= 2
    })
  })

  if (upcoming.length === 0) return res.status(200).json({ sent: 0, reason: 'no upcoming exams' })

  const body = upcoming.map((s) => `${s.modules?.name || ''} — ${s.title}`.trim()).join(', ')

  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  let sent = 0
  const expiredIds = []

  await Promise.all((subs || []).map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: '📝 Upcoming Exam', body, url: '/schedule' })
      )
      sent++
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) expiredIds.push(sub.id)
    }
  }))

  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
  }

  return res.status(200).json({ sent, upcomingCount: upcoming.length })
}
