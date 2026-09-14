import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const SUPABASE_URL = process.env.SUPABASE_URL

// `deadline` only stores a DATE, so "6 hours before" treats the
// deadline as end-of-day (23:59:59) in Egypt local time. Egypt
// observes DST, so the offset comes from the IANA timezone.
const EGYPT_TIMEZONE = 'Africa/Cairo'
const REMINDER_WINDOW_HOURS = 6
// Safety cap: don't fire reminders for tasks already more than this
// many hours overdue.
const MAX_OVERDUE_HOURS = 24

webpush.setVapidDetails(
  'mailto:admin@znu-future-doctors.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const cairoTimeZoneFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EGYPT_TIMEZONE,
  timeZoneName: 'longOffset'
})

function cairoOffsetMs(instant) {
  const offset = cairoTimeZoneFormatter
    .formatToParts(instant)
    .find((part) => part.type === 'timeZoneName')?.value
  const match = offset?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/)

  if (!match) throw new Error(`Could not determine ${EGYPT_TIMEZONE} offset`)

  const [, sign, hours, minutes = '0'] = match
  const milliseconds = (Number(hours) * 60 + Number(minutes)) * 60 * 1000
  return sign === '+' ? milliseconds : -milliseconds
}

function deadlineInstant(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const wallClockTime = Date.UTC(year, month - 1, day, 23, 59, 59)

  // Resolve the Cairo offset at the resulting instant, not at UTC
  // wall-clock time. Repeating once handles the DST boundary correctly.
  let timestamp = wallClockTime
  for (let i = 0; i < 2; i += 1) {
    timestamp = wallClockTime - cairoOffsetMs(new Date(timestamp))
  }
  return new Date(timestamp)
}

// Triggered hourly by GitHub Actions. Sends a reminder ONLY to the
// specific task's owner, via that task's own user_id — never a
// broadcast. Guest checklists (localStorage only) can't be reached here.
export default async function handler(req, res) {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!SUPABASE_URL) {
    console.error('[checklist-reminders] Missing SUPABASE_URL environment variable.')
    return res.status(500).json({ error: 'Server misconfiguration (missing SUPABASE_URL)' })
  }

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: tasks, error: tasksError } = await supabase
    .from('user_checklist')
    .select('id, user_id, text, deadline, module_id, modules(name)')
    .eq('done', false)
    .eq('reminder_sent', false)
    .not('deadline', 'is', null)
    .not('user_id', 'is', null)

  if (tasksError) {
    return res.status(500).json({ error: tasksError.message })
  }
  if (!tasks || tasks.length === 0) {
    return res.status(200).json({ sent: 0, reason: 'no eligible tasks' })
  }

  const now = Date.now()
  const due = []
  // Tasks more than MAX_OVERDUE_HOURS past due get marked reminder_sent
  // (without counting as sent) so they stop being refetched every hour.
  const staleIds = []

  tasks.forEach((t) => {
    const hoursLeft = (deadlineInstant(t.deadline).getTime() - now) / (1000 * 60 * 60)
    if (hoursLeft <= REMINDER_WINDOW_HOURS && hoursLeft >= -MAX_OVERDUE_HOURS) {
      due.push(t)
    } else if (hoursLeft < -MAX_OVERDUE_HOURS) {
      staleIds.push(t.id)
    }
  })

  if (staleIds.length > 0) {
    await supabase.from('user_checklist').update({ reminder_sent: true }).in('id', staleIds)
  }

  if (due.length === 0) {
    return res.status(200).json({ sent: 0, reason: 'nothing due within the reminder window' })
  }

  let sent = 0
  const remindedTaskIds = []
  const expiredSubIds = []

  await Promise.all(due.map(async (task) => {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', task.user_id)

    if (!subs || subs.length === 0) {
      // No push device — mark reminded so it isn't re-checked every hour.
      remindedTaskIds.push(task.id)
      return
    }

    const moduleName = task.modules?.name ? `${task.modules.name} — ` : ''
    const body = `${moduleName}"${task.text}" is due soon and still not checked off. ⏰`

    let deliveredToAtLeastOne = false
    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: '🎯 Checklist Reminder', body, url: '/checklist' })
        )
        deliveredToAtLeastOne = true
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) expiredSubIds.push(sub.id)
      }
    }))

    // A temporary push failure leaves the task eligible for the next run.
    if (deliveredToAtLeastOne) {
      sent++
      remindedTaskIds.push(task.id)
    }
  }))

  if (remindedTaskIds.length > 0) {
    await supabase.from('user_checklist').update({ reminder_sent: true }).in('id', remindedTaskIds)
  }
  if (expiredSubIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredSubIds)
  }

  return res.status(200).json({ sent, tasksChecked: due.length })
}
