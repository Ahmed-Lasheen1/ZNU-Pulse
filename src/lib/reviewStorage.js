// Local (per-device) fallback for Review/Resume — used only when
// nobody is signed in. Signing in switches to the real Supabase-backed
// versions (see migrateGuestData.js for the one-time handoff).

const FLAGGED_KEY = 'mcq_flagged'
const INCORRECT_KEY = 'mcq_incorrect'
const HISTORY_KEY = 'mcq_history'
const ACTIVE_EXAM_KEY = 'mcq_active_exam'

// Caps growth for long-term guest devices — oldest entries are dropped.
const MAX_FLAGGED = 200
const MAX_INCORRECT = 200

function readList(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function writeList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch { /* storage unavailable */ }
}
function removeKey(key) {
  try { localStorage.removeItem(key) } catch { /* storage unavailable */ }
}

// ── Flags ──────────────────────────────────────────────────────────
export function getGuestFlags() { return readList(FLAGGED_KEY) }
export function setGuestFlags(list) { writeList(FLAGGED_KEY, list) }

export function toggleGuestFlag(entry) {
  const list = readList(FLAGGED_KEY)
  const idx = list.findIndex(f => f.question_id === entry.question_id)
  if (idx >= 0) {
    list.splice(idx, 1)
    writeList(FLAGGED_KEY, list)
    return false
  }
  list.push({ ...entry, flaggedAt: Date.now() })
  if (list.length > MAX_FLAGGED) list.splice(0, list.length - MAX_FLAGGED)
  writeList(FLAGGED_KEY, list)
  return true
}

export function clearGuestFlags() {
  removeKey(FLAGGED_KEY)
}

// ── Incorrect questions ───────────────────────────────────────────
export function getGuestIncorrect() { return readList(INCORRECT_KEY) }
export function setGuestIncorrect(list) { writeList(INCORRECT_KEY, list) }

export function saveGuestIncorrect(entry) {
  const list = readList(INCORRECT_KEY)
  const idx = list.findIndex(q => q.question_id === entry.question_id)
  if (idx >= 0) list[idx] = { ...list[idx], ...entry, updatedAt: Date.now() }
  else list.push({ ...entry, updatedAt: Date.now() })
  if (list.length > MAX_INCORRECT) list.splice(0, list.length - MAX_INCORRECT)
  writeList(INCORRECT_KEY, list)
}

// Backfills the correct answer/explanation for a flagged question once
// a quiz grades it — the grading result already legitimately reveals
// this, so copying it into the flag entry isn't a new exposure.
export function enrichGuestFlagsWithResults(resultMap) {
  const list = readList(FLAGGED_KEY)
  let changed = false
  list.forEach(f => {
    const r = resultMap[f.question_id]
    if (r && !f.correct_answer) {
      f.correct_answer = r.correct_answer
      f.explanation = r.explanation
      changed = true
    }
  })
  if (changed) writeList(FLAGGED_KEY, list)
}

export function clearGuestIncorrect() {
  removeKey(INCORRECT_KEY)
}

// ── Exam history ──────────────────────────────────────────────────
export function getGuestHistory() { return readList(HISTORY_KEY) }
export function setGuestHistory(list) { writeList(HISTORY_KEY, list) }

export function addGuestHistory(entry) {
  const list = readList(HISTORY_KEY)
  list.unshift({ ...entry, completed_at: Date.now() })
  if (list.length > 50) list.length = 50
  writeList(HISTORY_KEY, list)
}

export function clearGuestHistory() {
  removeKey(HISTORY_KEY)
}

// ── Active (in-progress) exam, for Resume ─────────────────────────
export function getGuestActiveExam() {
  try { return JSON.parse(localStorage.getItem(ACTIVE_EXAM_KEY) || 'null') } catch { return null }
}
export function saveGuestActiveExam(data) {
  try { localStorage.setItem(ACTIVE_EXAM_KEY, JSON.stringify(data)) } catch { /* storage unavailable */ }
}
export function clearGuestActiveExam() {
  removeKey(ACTIVE_EXAM_KEY)
}
