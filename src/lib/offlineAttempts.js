import { supabase } from '../supabase'
import { idbGet, idbSet, idbDelete, idbKeys } from './idb'
import { loadAnswerKeys } from './moduleContent'

const ATTEMPT_PREFIX = 'attempt:'

const listeners = new Set()
const notify = () => listeners.forEach(listener => listener())

let syncing = false

export function subscribePendingAttempts(listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export const isTransientFailure = ({ error, status }) => !!error && (status === 0 || status >= 500)

// Same rule as the server: an unanswered question is never correct.
// Returns null when an answer key for any question isn't available on this device.
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

export async function savePendingAttempt(attempt) {
  const record = { ...attempt, id: crypto.randomUUID(), error: null }
  Promise.resolve(navigator.storage?.persist?.()).catch(() => {})
  const saved = (await idbSet(ATTEMPT_PREFIX + record.id, record)) != null
  if (saved) notify()
  return saved
}

export async function listPendingAttempts(userId) {
  const keys = (await idbKeys()).filter(key => typeof key === 'string' && key.startsWith(ATTEMPT_PREFIX))
  const records = await Promise.all(keys.map(key => idbGet(key)))
  return records
    .filter(record => record && record.userId === userId)
    .sort((a, b) => a.completedAt - b.completedAt)
}

export async function discardPendingAttempt(id) {
  await idbDelete(ATTEMPT_PREFIX + id)
  notify()
}

// An attempt leaves local storage only after the server confirms it. Network and
// server outages stop the run and keep everything for the next one; a rejection
// is recorded on the attempt and only retried when `includeFailed` is set.
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
