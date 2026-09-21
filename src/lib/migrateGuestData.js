import { supabase } from '../supabase'
import {
  getGuestFlags, clearGuestFlags, setGuestFlags,
  getGuestHistory, clearGuestHistory, setGuestHistory,
} from './reviewStorage'

// One-time handoff when a guest signs in on the same device.
// The paused guest exam is not migrated.
async function safeInsert(table, row) {
  try {
    const { error } = await supabase.from(table).insert(row)
    // 23505 = already exists = success.
    if (error && error.code !== '23505') {
      console.warn(`[migrateGuestData] Could not migrate a row into ${table}:`, error.message)
      return false
    }
    return true
  } catch (e) {
    console.warn(`[migrateGuestData] Unexpected error migrating a row into ${table}:`, e)
    return false
  }
}

// Only rows that failed stay in local storage.
async function migrateFlags(userId) {
  const flags = getGuestFlags()
  if (flags.length === 0) return
  const results = await Promise.all(flags.map(f => safeInsert('flagged_questions', {
    user_id: userId,
    question_id: f.question_id,
    module_id: f.module_id || null,
  })))
  const failed = flags.filter((_, i) => !results[i])
  if (failed.length > 0) setGuestFlags(failed)
  else clearGuestFlags()
}

async function migrateHistory(userId) {
  const history = getGuestHistory()
  if (history.length === 0) return
  const results = await Promise.all(history.map(h => safeInsert('exam_history', {
    user_id: userId,
    module_id: h.module_id || null,
    quiz_type: h.quiz_type,
    subject_id: h.subject_id || null,
    total: h.total,
    correct: h.correct,
    score: h.score,
    time_sec: h.time_sec ?? null,
    completed_at: new Date(h.completed_at).toISOString(),
  })))
  const failed = history.filter((_, i) => !results[i])
  if (failed.length > 0) setGuestHistory(failed)
  else clearGuestHistory()
}

export async function migrateGuestDataIfNeeded(userId) {
  if (!userId) return
  if (getGuestFlags().length === 0 && getGuestHistory().length === 0) return

  await Promise.all([
    migrateFlags(userId),
    migrateHistory(userId),
  ])
}
