import { idbGet, idbSet, idbDelete } from './idb'

export const MINUTE = 60 * 1000
export const REFERENCE_TTL = 10 * MINUTE

const memory = new Map()
const inFlight = new Map()
const generations = new Map()

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
