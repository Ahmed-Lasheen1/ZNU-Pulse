// src/lib/createTableCache.js
// Generic "load once, cache in memory, invalidate on demand" pattern
// shared by subjects.js, lessons.js, and moduleStages.js — each of
// those tables changes rarely (only via Admin) but was being queried
// fresh on every page navigation before this existed.
export function createTableCache(fetcher) {
  let cache = null
  let inFlight = null

  async function ensureLoaded() {
    if (cache) return { data: cache, error: null }
    if (!inFlight) {
      inFlight = fetcher().then(res => {
        inFlight = null
        return res
      })
    }
    const { data, error } = await inFlight
    if (error) return { data: [], error }
    cache = data || []
    return { data: cache, error: null }
  }

  function invalidate() {
    cache = null
  }

  return { ensureLoaded, invalidate }
}
