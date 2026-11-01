import { supabase } from '@/core/supabase'
import { idbGet, idbSet, idbDelete, idbKeys } from '@/core/idb'
import { loadAnswerKeys } from '@/services/content/moduleContent'
import { isTransientFailure } from '@/services/offline/isTransientFailure'

const ATTEMPT_PREFIX = 'attempt:'

const listeners = new Set()
// Tells subscribers that the pending-attempts list changed.
const notify = () => listeners.forEach(listener => listener())

let syncing = false

// Registers a listener for pending-attempt changes; returns an unsubscribe function.
export function subscribePendingAttempts(listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

// Grades answers on this device with the cached answer keys (null when a key is missing).
export async function gradeLocally(questions, answers) {
  const keys = await loadAnswerKeys(questions.map(question => question.module_id))
  const results = {}
  for (let i = 0; i < questions.length; i++) {
    const key = keys.get(questions[i].id)
    if (!key) return null
    results[questions[i].id] = {
      is_correct: answers[i] != null && answers[i] === key.correct,
      correct_answer: key.correct,
      explanation: key.explanation,
    }
  }
  return results
}

// Keeps the caller's attempt id so the server row and the device copy share one id.
export async function savePendingAttempt(attempt) {
  const record = { ...attempt, id: attempt.id || crypto.randomUUID(), error: null }
  Promise.resolve(navigator.storage?.persist?.()).catch(() => {})
  const saved = (await idbSet(ATTEMPT_PREFIX + record.id, record)) != null
  if (saved) notify()
  return saved
}

// Lists a user's attempts waiting to sync, oldest first.
export async function listPendingAttempts(userId) {
  const keys = (await idbKeys()).filter(key => typeof key === 'string' && key.startsWith(ATTEMPT_PREFIX))
  const records = await Promise.all(keys.map(key => idbGet(key)))
  return records
    .filter(record => record && record.userId === userId)
    .sort((a, b) => a.completedAt - b.completedAt)
}

// Deletes a pending attempt without syncing it.
export async function discardPendingAttempt(id) {
  await idbDelete(ATTEMPT_PREFIX + id)
  notify()
}

// Uploads pending attempts, stopping at the first retryable failure.
export async function syncPendingAttempts(userId, { includeFailed = false } = {}) {
  if (syncing) return { synced: 0, rejected: 0 }
  syncing = true
  let synced = 0
  let rejected = 0
  try {
    const attempts = (await listPendingAttempts(userId)).filter(attempt => includeFailed || !attempt.error)
    for (const attempt of attempts) {
      const response = await supabase.rpc('submit_offline_attempt', {
        p_attempt_id: attempt.id,
        p_answers: attempt.answers,
        p_module_id: attempt.moduleId,
        p_quiz_type: attempt.quizType,
        p_subject_id: attempt.subjectId,
        p_time_sec: attempt.timeSec,
        p_completed_at: new Date(attempt.completedAt).toISOString(),
        p_possible_duplicate: !!attempt.possibleDuplicate,
        p_stage: attempt.stage || null,
      })
      if (!response.error && response.data?.length) {
        await idbDelete(ATTEMPT_PREFIX + attempt.id)
        synced++
      } else if (isTransientFailure(response)) {
        break
      } else {
        rejected++
        await idbSet(ATTEMPT_PREFIX + attempt.id, {
          ...attempt,
          error: response.error?.message || 'Unexpected server response',
        })
      }
    }
  } finally {
    syncing = false
  }
  if (synced || rejected) notify()
  return { synced, rejected }
}
