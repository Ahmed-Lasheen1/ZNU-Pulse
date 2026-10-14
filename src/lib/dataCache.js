import { idbGet, idbSet, idbDelete, idbKeys } from './idb'

export const MINUTE = 60 * 1000
export const REFERENCE_TTL = 10 * MINUTE

const USER_PREFIX = 'user:'

const memory = new Map()
const inFlight = new Map()
const generations = new Map()
let userEpoch = 0

const generationOf = key => generations.get(key) ?? 0

export function invalidateCache(key) {
  generations.set(key, generationOf(key) + 1)
  memory.delete(key)
  inFlight.delete(key)
  idbDelete(key)
}

async function readEntry(key) {
  const hit = memory.get(key)
  if (hit) return hit
  const generation = generationOf(key)
  const stored = await idbGet(key)
  if (!stored || generationOf(key) !== generation) return memory.get(key) ?? null
  if (!memory.has(key)) memory.set(key, stored)
  return memory.get(key)
}

function refresh(key, fetcher) {
  const running = inFlight.get(key)
  if (running) return running
  const generation = generationOf(key)
  const promise = Promise.resolve()
    .then(fetcher)
    .catch(error => ({ data: null, error }))
    .then(({ data, error }) => {
      if (inFlight.get(key) === promise) inFlight.delete(key)
      if (error) return { data: null, error }
      if (generationOf(key) === generation) {
        const entry = { data, savedAt: Date.now() }
        memory.set(key, entry)
        idbSet(key, entry)
      }
      return { data, error: null }
    })
  inFlight.set(key, promise)
  return promise
}

export async function cachedQuery(key, fetcher, { ttl, onUpdate } = {}) {
  const entry = await readEntry(key)
  if (!entry) return refresh(key, fetcher)
  if (Date.now() - entry.savedAt >= ttl) {
    refresh(key, fetcher).then(result => onUpdate?.(result))
  }
  return { data: entry.data, error: null }
}

export function saveCached(key, data) {
  const entry = { data, savedAt: Date.now() }
  memory.set(key, entry)
  idbSet(key, entry)
}

// Always fetches fresh when online; the saved copy is used only when offline or the request fails.
export async function networkFirst(key, fetcher) {
  const epoch = userEpoch
  if (navigator.onLine) {
    const result = await Promise.resolve().then(fetcher).catch(error => ({ data: null, error }))
    if (!result.error) {
      if (epoch === userEpoch) saveCached(key, result.data)
      return { data: result.data, error: null, fromCache: false }
    }
    const saved = await readEntry(key)
    if (saved) return { data: saved.data, error: null, fromCache: true }
    return { data: null, error: result.error, fromCache: false }
  }
  const saved = await readEntry(key)
  if (saved) return { data: saved.data, error: null, fromCache: true }
  return { data: null, error: new Error('Offline'), fromCache: false }
}

export async function clearUserCaches() {
  userEpoch++
  for (const key of [...memory.keys()]) {
    if (key.startsWith(USER_PREFIX)) memory.delete(key)
  }
  const keys = await idbKeys()
  keys.forEach(key => {
    if (typeof key === 'string' && key.startsWith(USER_PREFIX)) idbDelete(key)
  })
}
