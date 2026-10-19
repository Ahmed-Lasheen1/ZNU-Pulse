import { supabase } from '../supabase'
import {
  getGuestFlags, clearGuestFlags, setGuestFlags,
  getGuestHistory, clearGuestHistory, setGuestHistory,
} from './reviewStorage'
import { removeFullAttempts } from './fullHistory'

// One migration per user at a time; concurrent callers share the same promise.
const inFlight = new Map()

// Stops a stalled full-copy cleanup from holding up the migration.
const CLEANUP_TIMEOUT_MS = 5000

// RLS limits this select to the signed-in user's own rows.
async function historyRowExists(userId, id) {
  try {
    const { data, error } = await supabase
      .from('exam_history')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    return !error && data?.id === id
  } catch {
    return false
  }
}

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

// True only when the local copy can be deleted.
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

// Includes the guest id so a retry after a lost response hits the primary key.
function toHistoryRow(userId, h) {
  return {
    ...(typeof h.id === 'string' && h.id ? { id: h.id } : {}),
    user_id: userId,
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

// True only when the local copy can be deleted.
async function migrateHistoryEntry(userId, h) {
  try {
    const row = toHistoryRow(userId, h)
    const { error } = await supabase.from('exam_history').insert(row)
    if (!error) return true
    if (error.code === '23505' && row.id) return historyRowExists(userId, row.id)
    console.warn('[migrateGuestData] History not migrated, kept locally:', error.code, error.message)
    return false
  } catch (e) {
    console.warn('[migrateGuestData] History migration threw, kept locally:', e)
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

async function migrateHistory(userId) {
  const history = getGuestHistory()
  if (history.length === 0) return
  const results = await Promise.all(history.map(h => migrateHistoryEntry(userId, h)))
  const failed = history.filter((_, i) => !results[i])
  const migratedIds = history.filter((_, i) => results[i]).map(h => h.id).filter(Boolean)
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

// Safe to call repeatedly; duplicates are confirmed, not re-created.
export function migrateGuestDataIfNeeded(userId) {
  if (!userId) return Promise.resolve()
  if (inFlight.has(userId)) return inFlight.get(userId)

  const run = (async () => {
    try {
      if (getGuestFlags().length === 0 && getGuestHistory().length === 0) return
      await Promise.all([migrateFlags(userId), migrateHistory(userId)])
    } catch (e) {
      console.warn('[migrateGuestData] Migration stopped, local data kept:', e)
    }
  })()

  inFlight.set(userId, run)
  run.finally(() => inFlight.delete(userId))
  return run
}
