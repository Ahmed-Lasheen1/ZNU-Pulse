// Lets someone who submitted an anonymous question later check whether
// it's been answered — without an account or revealing who they are.
// A random token is generated client-side at submit time, saved once
// in the `anonymous_questions` row itself and once here in localStorage.
import { storageGet, storageSet } from '@/core/safeStorage'

const KEY = 'my_anon_questions'
const NOTIFIED_KEY = 'anon_notified_tokens'
// Caps list growth for long-term users — keeps the most recent entries.
const MAX_STORED = 200

// Reads a JSON list from localStorage ([] on any error).
function readList(key) {
  try { return JSON.parse(storageGet(key) || '[]') } catch { return [] }
}

// Returns the tracking tokens of questions asked from this device.
export function getMyAnonTokens() {
  return readList(KEY)
}

// Remembers the tracking token of a newly submitted question.
export function addMyAnonToken(token) {
  const list = getMyAnonTokens()
  list.push(token)
  if (list.length > MAX_STORED) list.splice(0, list.length - MAX_STORED)
  storageSet(KEY, JSON.stringify(list))
}

// Returns the tokens whose answer notification was already shown.
export function getNotifiedTokens() {
  return readList(NOTIFIED_KEY)
}

// Marks tokens as notified so their answer is announced only once.
export function markTokensNotified(tokens) {
  const existing = getNotifiedTokens()
  let merged = [...existing, ...tokens]
  if (merged.length > MAX_STORED) merged = merged.slice(merged.length - MAX_STORED)
  storageSet(NOTIFIED_KEY, JSON.stringify(merged))
}
