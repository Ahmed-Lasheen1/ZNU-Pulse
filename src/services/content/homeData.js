import { supabase } from '@/core/supabase'
import { cachedQuery, invalidateCache, networkFirst, MINUTE } from '@/core/dataCache'

const ANNOUNCEMENT_KEY = 'home-announcement'
const EXAMS_KEY = 'home-exam-schedules'
const HISTORY_TTL_MS = 2 * MINUTE

let history = null
let historyInFlight = null
let generation = 0

// Loads the Home announcement text, cached for 5 minutes.
export function fetchHomeAnnouncement(onUpdate) {
  return cachedQuery(
    ANNOUNCEMENT_KEY,
    () => supabase.from('site_settings').select('value').eq('key', 'home_announcement').maybeSingle(),
    { ttl: 5 * MINUTE, onUpdate: result => { if (!result.error) onUpdate?.(result.data?.value || '') } }
  )
}

// Clears the cached announcement.
export function invalidateHomeAnnouncement() {
  invalidateCache(ANNOUNCEMENT_KEY)
}

// Loads every exam schedule's title, dates and module for the Home countdown, cached for 10 minutes.
export function fetchExamSchedules() {
  return cachedQuery(
    EXAMS_KEY,
    () => supabase.from('schedules').select('id, title, dates, module_id').eq('type', 'exam').not('dates', 'is', null),
    { ttl: 10 * MINUTE }
  )
}

// Clears the cached exam schedules (after an admin changes a schedule).
export function invalidateExamSchedules() {
  invalidateCache(EXAMS_KEY)
}

// Memory-cached for 2 minutes; the last good copy is also kept on the device for offline use.
export function fetchHomeHistory(userId, limit) {
  if (history?.userId === userId && Date.now() - history.at < HISTORY_TTL_MS) return Promise.resolve(history.rows)
  if (historyInFlight?.userId === userId) return historyInFlight.promise
  const gen = generation
  const promise = networkFirst(`user:${userId}:home-history`, () => supabase
    .from('exam_history')
    .select('completed_at, total, correct, subject_id')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit))
    .then(({ data, error, fromCache }) => {
      if (historyInFlight?.promise === promise) historyInFlight = null
      if (error || !data) return []
      if (gen === generation && !fromCache) history = { userId, rows: data, at: Date.now() }
      return data
    })
  historyInFlight = { userId, promise }
  return promise
}

// Drops the cached exam history (after a new attempt or on sign-out).
export function clearHomeHistory() {
  generation++
  history = null
  historyInFlight = null
}
