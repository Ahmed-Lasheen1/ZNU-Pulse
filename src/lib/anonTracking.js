// src/lib/anonTracking.js
// Lets someone who submitted an anonymous question later check whether
// it's been answered — without an account or revealing who they are.
// A random token is generated client-side at submit time, saved once
// in the `anonymous_questions` row itself and once here in localStorage.
const KEY = 'my_anon_questions'
const NOTIFIED_KEY = 'anon_notified_tokens'
// Caps list growth for long-term users — keeps the most recent entries.
const MAX_STORED = 200

export function getMyAnonTokens() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function addMyAnonToken(token) {
  const list = getMyAnonTokens()
  list.push(token)
  if (list.length > MAX_STORED) list.splice(0, list.length - MAX_STORED)
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function getNotifiedTokens() {
  try { return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]') } catch { return [] }
}

export function markTokensNotified(tokens) {
  const existing = getNotifiedTokens()
  let merged = [...existing, ...tokens]
  if (merged.length > MAX_STORED) merged = merged.slice(merged.length - MAX_STORED)
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(merged))
}
