import { supabase } from '../supabase'
import {
  getGuestFlags, clearGuestFlags, setGuestFlags,
  getGuestIncorrect, clearGuestIncorrect, setGuestIncorrect,
  getGuestHistory, clearGuestHistory, setGuestHistory,
} from './reviewStorage'

// One-time handoff for a student who practiced as a guest and then
// signs in on the same device. The guest "active exam" (paused quiz)
// is deliberately NOT migrated — short-lived selection state, not a
// durable record.
async function safeInsert(table, row) {
  try {
    const { error } = await supabase.from(table).insert(row)
    // Postgres unique_violation (23505) = "already exists" = success.
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

// Each migrate* function keeps only the rows that actually failed in
// local storage — a single bad row (e.g. pointing at a deleted
// question) no longer blocks the rest of that batch from ever being
// cleared.
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

async function migrateIncorrect(userId) {
  const incorrect = getGuestIncorrect()
  if (incorrect.length === 0) return
  const results = await Promise.all(incorrect.map(q => safeInsert('answered_questions', {
    user_id: userId,
    question_id: q.question_id,
    correct: false,
  })))
  const failed = incorrect.filter((_, i) => !results[i])
  if (failed.length > 0) setGuestIncorrect(failed)
  else clearGuestIncorrect()
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

// Cheap to call on every sign-in — returns immediately if there's
// nothing local to migrate.
export async function migrateGuestDataIfNeeded(userId) {
  if (!userId) return
  const hasAnything =
    getGuestFlags().length > 0 ||
    getGuestIncorrect().length > 0 ||
    getGuestHistory().length > 0
  if (!hasAnything) return

  await Promise.all([
    migrateFlags(userId),
    migrateIncorrect(userId),
    migrateHistory(userId),
  ])
}
