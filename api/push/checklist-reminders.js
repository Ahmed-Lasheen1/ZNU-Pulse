// api/push/checklist-reminders.js
import { getAdminClient, sendToSubscriptions, requireCronSecret } from '../_lib/webpush'

// `deadline` is date-only, so "6 hours before" treats it as
// end-of-day Egypt time. Egypt observes DST, so the offset comes
// from the IANA timezone rather than a fixed number.
const EGYPT_TIMEZONE = 'Africa/Cairo'
const REMINDER_WINDOW_HOURS = 6
const MAX_OVERDUE_HOURS = 24

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
  // Resolve the Cairo offset at the resulting instant; repeating once
  // handles the DST boundary correctly.
  let timestamp = wallClockTime
  for (let i = 0; i < 2; i += 1) {
    timestamp = wallClockTime - cairoOffsetMs(new Date(timestamp))
  }
  return new Date(timestamp)
}

// Hourly cron. Notifies only a task's own owner, via that task's
// user_id — never a broadcast. Guest checklists can't be reached here.
export default async function handler(req, res) {
  if (!requireCronSecret(req, res)) return

  const supabase = getAdminClient('checklist-reminders')
  if (!supabase) return res.status(500).json({ error: 'Server misconfiguration (missing SUPABASE_URL)' })

  const { data: tasks, error: tasksError } = await supabase
    .from('user_checklist')
    .select('id, user_id, text, deadline, module_id, modules(name)')
    .eq('done', false)
    .eq('reminder_sent', false)
    .not('deadline', 'is', null)
    .not('user_id', 'is', null)

  if (tasksError) return res.status(500).json({ error: tasksError.message })
  if (!tasks || tasks.length === 0) return res.status(200).json({ sent: 0, reason: 'no eligible tasks' })

  const now = Date.now()
  const due = []
  // Tasks more than MAX_OVERDUE_HOURS past due get marked reminder_sent
  // (without counting as sent) so they stop being refetched every hour.
  const staleIds = []

  tasks.forEach((t) => {
    const hoursLeft = (deadlineInstant(t.deadline).getTime() - now) / (1000 * 60 * 60)
    if (hoursLeft <= REMINDER_WINDOW_HOURS && hoursLeft >= -MAX_OVERDUE_HOURS) due.push(t)
    else if (hoursLeft < -MAX_OVERDUE_HOURS) staleIds.push(t.id)
  })

  if (staleIds.length > 0) {
    await supabase.from('user_checklist').update({ reminder_sent: true }).in('id', staleIds)
  }
  if (due.length === 0) return res.status(200).json({ sent: 0, reason: 'nothing due within the reminder window' })

  let sent = 0
  const remindedTaskIds = []

  await Promise.all(due.map(async (task) => {
    const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', task.user_id)

    // No push device — mark reminded so it isn't re-checked every hour.
    if (!subs || subs.length === 0) { remindedTaskIds.push(task.id); return }

    const moduleName = task.modules?.name ? `${task.modules.name} — ` : ''
    const body = `${moduleName}"${task.text}" is due soon and still not checked off. ⏰`
    const { sent: userSent } = await sendToSubscriptions(supabase, subs, { title: '🎯 Checklist Reminder', body, url: '/checklist' })

    // A temporary push failure leaves the task eligible for the next run.
    if (userSent > 0) { sent += userSent; remindedTaskIds.push(task.id) }
  }))

  if (remindedTaskIds.length > 0) {
    await supabase.from('user_checklist').update({ reminder_sent: true }).in('id', remindedTaskIds)
  }

  return res.status(200).json({ sent, tasksChecked: due.length })
}
