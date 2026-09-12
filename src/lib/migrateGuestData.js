import { supabase } from '../supabase'
import {
  getGuestFlags, clearGuestFlags,
  getGuestIncorrect, clearGuestIncorrect,
  getGuestHistory, clearGuestHistory,
} from './reviewStorage'

// One-time handoff for a student who practiced as a guest and then
// signs in on the same device — without this, everything they
// flagged/got wrong/completed as a guest becomes invisible once
// Review.tsx/Profile.tsx switch to reading exclusively from Supabase.
// The guest "active exam" (paused quiz) is deliberately NOT migrated —
// short-lived selection state, not a durable record.
async function safeInsert(table, row) {
  try {
    const { error } = await supabase.from(table).insert(row)
    // Postgres unique_violation (23505) = "already exists", treated as
    // success rather than failure.
    if (error && error.code !== '23505') {
      console.warn(`[migrateGuestData] Could not migrate a row into ${table}:`, error.message)
    }
  } catch (e) {
    console.warn(`[migrateGuestData] Unexpected error migrating a row into ${table}:`, e)
  }
}

async function migrateFlags(userId) {
  const flags = getGuestFlags()
  if (flags.length === 0) return
  await Promise.all(flags.map(f => safeInsert('flagged_questions', {
    user_id: userId,
    question_id: f.question_id,
    module_id: f.module_id || null,
  })))
}

async function migrateIncorrect(userId) {
  const incorrect = getGuestIncorrect()
  if (incorrect.length === 0) return
  // Becomes an ordinary answered_questions row marked incorrect — no
  // points awarded (MCQ.tsx only scores questions not already present
  // in answered_questions, so this correctly blocks a later re-answer
  // from being scored as "new").
  await Promise.all(incorrect.map(q => safeInsert('answered_questions', {
    user_id: userId,
    question_id: q.question_id,
    correct: false,
  })))
}

async function migrateHistory(userId) {
  const history = getGuestHistory()
  if (history.length === 0) return
  await Promise.all(history.map(h => safeInsert('exam_history', {
    user_id: userId,
    module_id: h.module_id || null,
    quiz_type: h.quiz_type,
    subject_id: h.subject_id || null,
    total: h.total,
    correct: h.correct,
    score: h.score,
    time_sec: h.time_sec ?? null,
    // Guest history stores completed_at as ms-epoch; the real column
    // is a timestamptz.
    completed_at: new Date(h.completed_at).toISOString(),
  })))
}

// Cheap to call on every sign-in — returns immediately if there's
// nothing local to migrate. Local copies are cleared after attempting
// migration regardless of individual-row outcomes, so this naturally
// runs at most once per device.
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

  clearGuestFlags()
  clearGuestIncorrect()
  clearGuestHistory()
}
