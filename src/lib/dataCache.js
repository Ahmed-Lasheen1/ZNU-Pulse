import { idbGet, idbSet, idbDelete, idbKeys } from './idb'

export const MINUTE = 60 * 1000
export const REFERENCE_TTL = 10 * MINUTE

const USER_PREFIX = 'user:'

const VALIDATION_WINDOW = 30 * MINUTE
const MAX_VALIDATED_AGE = 24 * 60 * MINUTE
const VALIDATION_GRACE_MS = 3000

const memory = new Map()
const inFlight = new Map()
const generations = new Map()
let userEpoch = 0
let validatedAt = 0

const generationOf = key => generations.get(key) ?? 0

// Called by contentVersions after a check that found nothing changed. `at` is when that check started.
export function markContentValidated(at = Date.now()) {
  if (at > validatedAt) validatedAt = at
}

// True when a version check has confirmed this entry is still current.
function isValidated(entry) {
  if (!validatedAt) return false
  const now = Date.now()
  return validatedAt >= entry.savedAt
    && now - validatedAt < VALIDATION_WINDOW
    && now - entry.savedAt < MAX_VALIDATED_AGE
}

// Removes a cached entry and cancels any in-flight refresh for it.
export function invalidateCache(key) {
  generations.set(key, generationOf(key) + 1)
  memory.delete(key)
  inFlight.delete(key)
  idbDelete(key)
}

// Reads an entry from memory, falling back to IndexedDB.
async function readEntry(key) {
  const hit = memory.get(key)
  if (hit) return hit
  const generation = generationOf(key)
  const stored = await idbGet(key)
  if (!stored || generationOf(key) !== generation) return memory.get(key) ?? null
  if (!memory.has(key)) memory.set(key, stored)
  return memory.get(key)
}

// Runs the fetcher once per key at a time and stores a successful result.
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

// Gives the version check a moment to confirm the entry before refetching.
function refreshAfterCheck(key, fetcher, entry, onUpdate) {
  setTimeout(() => {
    if (memory.get(key) !== entry || isValidated(entry)) return
    refresh(key, fetcher).then(result => onUpdate?.(result))
  }, VALIDATION_GRACE_MS)
}

// Returns a cached result, refreshing it in the background once its TTL expires.
export async function cachedQuery(key, fetcher, { ttl, onUpdate, versioned = false } = {}) {
  const entry = await readEntry(key)
  if (!entry) return refresh(key, fetcher)
  if (Date.now() - entry.savedAt >= ttl) {
    if (!versioned) refresh(key, fetcher).then(result => onUpdate?.(result))
    else if (!isValidated(entry)) refreshAfterCheck(key, fetcher, entry, onUpdate)
  }
  return { data: entry.data, error: null }
}

// Shows the saved copy at once when one exists, then refreshes it in the background.
export async function cachedSnapshot(key, fetcher, { onUpdate } = {}) {
  const entry = await readEntry(key)
  if (entry) {
    if (navigator.onLine) {
      refresh(key, fetcher).then(result => { if (!result.error) onUpdate?.(result.data) })
    }
    return { data: entry.data, error: null, fromCache: true }
  }
  const result = await refresh(key, fetcher)
  return { ...result, fromCache: false }
}

// Stores a value directly as the saved copy for a key.
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

// Deletes every cached entry that belongs to a signed-in user.
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
