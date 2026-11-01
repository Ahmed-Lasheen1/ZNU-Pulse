// Per-device fallback for Review/Resume when nobody is signed in.
// Signing in switches to Supabase (see migrateGuestData.js).

const FLAGGED_KEY = 'mcq_flagged'
const HISTORY_KEY = 'mcq_history'
const ACTIVE_EXAM_KEY = 'mcq_active_exam'

const MAX_FLAGGED = 200

// Reads a JSON list from localStorage ([] on any error).
function readList(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
// Writes a JSON list to localStorage, ignoring storage errors.
function writeList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch { /* storage unavailable */ }
}
// Removes a localStorage key, ignoring storage errors.
function removeKey(key) {
  try { localStorage.removeItem(key) } catch { /* storage unavailable */ }
}

// Returns the guest's flagged questions.
export function getGuestFlags() { return readList(FLAGGED_KEY) }
// Replaces the guest's flagged questions.
export function setGuestFlags(list) { writeList(FLAGGED_KEY, list) }

// Flags or unflags a question; returns true when it is now flagged.
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

// Deletes all guest flags.
export function clearGuestFlags() {
  removeKey(FLAGGED_KEY)
}

// Backfills answer/explanation on flagged entries once a quiz grades them.
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

// Returns the guest's exam history.
export function getGuestHistory() { return readList(HISTORY_KEY) }
// Replaces the guest's exam history.
export function setGuestHistory(list) { writeList(HISTORY_KEY, list) }

// Adds an attempt to the top of the guest history (keeps the latest 50).
export function addGuestHistory(entry) {
  const list = readList(HISTORY_KEY)
  list.unshift({ ...entry, completed_at: Date.now() })
  if (list.length > 50) list.length = 50
  writeList(HISTORY_KEY, list)
}

// Deletes the guest history.
export function clearGuestHistory() {
  removeKey(HISTORY_KEY)
}

// Returns the guest's paused exam, if any.
export function getGuestActiveExam() {
  try { return JSON.parse(localStorage.getItem(ACTIVE_EXAM_KEY) || 'null') } catch { return null }
}
// Saves the guest's paused exam.
export function saveGuestActiveExam(data) {
  try { localStorage.setItem(ACTIVE_EXAM_KEY, JSON.stringify(data)) } catch { /* storage unavailable */ }
}
// Deletes the guest's paused exam.
export function clearGuestActiveExam() {
  removeKey(ACTIVE_EXAM_KEY)
}
