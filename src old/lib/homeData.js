import { supabase } from '../supabase'
import { cachedQuery, invalidateCache, networkFirst, MINUTE } from './dataCache'

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

export function clearHomeHistory() {
  generation++
  history = null
  historyInFlight = null
}
