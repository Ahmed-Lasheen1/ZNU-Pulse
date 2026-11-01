import { supabase } from '../supabase'
import {
  getGuestFlags, clearGuestFlags, setGuestFlags,
  getGuestHistory, clearGuestHistory, setGuestHistory,
} from './reviewStorage'
import { removeFullAttempts } from './fullHistory'

const inFlight = new Map()
const CLEANUP_TIMEOUT_MS = 5000

async function flagRowExists(userId, questionId) {
  try {
    const { data, error } = await supabase
      .from('flagged_questions')
      .select('question_id')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .maybeSingle()
    return !error && data?.question_id === questionId
  } catch {
    return false
  }
}

async function migrateFlagEntry(userId, flag) {
  try {
    const { error } = await supabase.from('flagged_questions').insert({
      user_id: userId,
      question_id: flag.question_id,
      module_id: flag.module_id || null,
    })
    if (!error) return true
    if (error.code === '23505') return flagRowExists(userId, flag.question_id)
    console.warn('[migrateGuestData] Flag not migrated, kept locally:', error.code, error.message)
    return false
  } catch (e) {
    console.warn('[migrateGuestData] Flag migration threw, kept locally:', e)
    return false
  }
}

async function migrateFlags(userId) {
  const flags = getGuestFlags()
  if (flags.length === 0) return
  const results = await Promise.all(flags.map(f => migrateFlagEntry(userId, f)))
  const failed = flags.filter((_, i) => !results[i])
  if (failed.length > 0) setGuestFlags(failed)
  else clearGuestFlags()
}

function toHistoryRpcRow(h) {
  return {
    id: typeof h.id === 'string' && h.id ? h.id : crypto.randomUUID(),
    module_id: h.module_id || null,
    quiz_type: h.quiz_type,
    subject_id: h.subject_id || null,
    stage: h.stage || null,
    total: h.total,
    correct: h.correct,
    score: h.score,
    time_sec: h.time_sec ?? null,
    completed_at: new Date(h.completed_at).toISOString(),
  }
}

async function migrateHistory() {
  const history = getGuestHistory()
  if (history.length === 0) return
  const rows = history.map(toHistoryRpcRow)

  const { data, error } = await supabase.rpc('migrate_guest_history', { p_rows: rows })
  if (error) {
    console.warn('[migrateGuestData] History not migrated, kept locally:', error.message)
    return
  }

  const migrated = new Set((data || []).map(r => r.migrated_id))
  const failed = history.filter((_, i) => !migrated.has(rows[i].id))
  const migratedIds = history.filter((_, i) => migrated.has(rows[i].id)).map(h => h.id).filter(Boolean)

  if (failed.length > 0) setGuestHistory(failed)
  else clearGuestHistory()

  if (migratedIds.length > 0) {
    try {
      await Promise.race([
        removeFullAttempts(null, migratedIds),
        new Promise(resolve => setTimeout(resolve, CLEANUP_TIMEOUT_MS)),
      ])
    } catch (e) {
      console.warn('[migrateGuestData] Could not remove full copies:', e)
    }
  }
}

export function migrateGuestDataIfNeeded(userId) {
  if (!userId) return Promise.resolve()
  if (inFlight.has(userId)) return inFlight.get(userId)

  const run = (async () => {
    try {
      if (getGuestFlags().length === 0 && getGuestHistory().length === 0) return
      await Promise.all([migrateFlags(userId), migrateHistory()])
    } catch (e) {
      console.warn('[migrateGuestData] Migration stopped, local data kept:', e)
    }
  })()

  inFlight.set(userId, run)
  run.finally(() => inFlight.delete(userId))
  return run
}
