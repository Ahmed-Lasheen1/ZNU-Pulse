import { supabase } from '../supabase'
import { cachedQuery, invalidateCache, MINUTE } from './dataCache'

const ANNOUNCEMENT_KEY = 'home-announcement'
const HISTORY_TTL_MS = 2 * MINUTE

let history = null
let historyInFlight = null
let generation = 0

export function fetchHomeAnnouncement(onUpdate) {
  return cachedQuery(
    ANNOUNCEMENT_KEY,
    () => supabase.from('site_settings').select('value').eq('key', 'home_announcement').maybeSingle(),
    { ttl: 5 * MINUTE, onUpdate: result => { if (!result.error) onUpdate?.(result.data?.value || '') } }
  )
}

export function invalidateHomeAnnouncement() {
  invalidateCache(ANNOUNCEMENT_KEY)
}

// Per-user, memory only (never written to IndexedDB). Errors are not cached.
export function fetchHomeHistory(userId, limit) {
  if (history?.userId === userId && Date.now() - history.at < HISTORY_TTL_MS) return Promise.resolve(history.rows)
  if (historyInFlight?.userId === userId) return historyInFlight.promise
  const gen = generation
  const promise = supabase
    .from('exam_history')
    .select('completed_at, total, correct, subject_id')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit)
    .then(({ data, error }) => {
      if (historyInFlight?.promise === promise) historyInFlight = null
      if (error || !data) return []
      if (gen === generation) history = { userId, rows: data, at: Date.now() }
      return data
    })
  historyInFlight = { userId, promise }
  return promise
}

export function clearHomeHistory() {
  generation++
  history = null
  historyInFlight = null
}
