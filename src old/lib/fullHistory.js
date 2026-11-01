import { idbGet, idbSet, idbDelete } from './idb'

// Full copy of each finished attempt (every question, your answer, the correct answer),
// kept on this device only. The server keeps just the incorrect questions.
const ENTRY = 'full-history:'
const INDEX = 'full-history-index:'
export const MAX_FULL_HISTORY = 50

const indexKey = userId => INDEX + (userId || 'guest')

let chain = Promise.resolve()

function queue(task) {
  const run = chain.then(task)
  chain = run.catch(() => {})
  return run
}

export function saveFullAttempt(userId, attempt) {
  return queue(async () => {
    const key = indexKey(userId)
    const index = ((await idbGet(key)) ?? []).filter(id => id !== attempt.id)
    index.unshift(attempt.id)
    const evicted = index.splice(MAX_FULL_HISTORY)
    await idbSet(ENTRY + attempt.id, attempt)
    await idbSet(key, index)
    await Promise.all(evicted.map(id => idbDelete(ENTRY + id)))
  })
}

export async function getFullAttempt(id) {
  if (!id) return null
  return (await idbGet(ENTRY + id)) ?? null
}

// With `ids`, removes just those attempts; without, removes every attempt saved for this owner (null owner = guest).
export function removeFullAttempts(userId, ids = null) {
  return queue(async () => {
    const key = indexKey(userId)
    const index = (await idbGet(key)) ?? []
    const doomed = ids ? index.filter(id => ids.includes(id)) : index
    await Promise.all(doomed.map(id => idbDelete(ENTRY + id)))
    const rest = index.filter(id => !doomed.includes(id))
    if (rest.length > 0) await idbSet(key, rest)
    else await idbDelete(key)
  })
}
