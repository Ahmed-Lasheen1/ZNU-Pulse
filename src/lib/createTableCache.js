// src/lib/createTableCache.js
// Generic "load once, cache in memory, invalidate on demand" pattern
// shared by subjects.js, lessons.js, and moduleStages.js — each of
// those tables changes rarely (only via Admin) but was being queried
// fresh on every page navigation before this existed.
export function createTableCache(fetcher) {
  let cache = null
  let inFlight = null
  // BUG FIX: if invalidate() was called while a fetch was already in
  // flight (e.g. an admin edit landing while another open tab is
  // mid-request), the old in-flight promise would still resolve and
  // silently repopulate `cache` with pre-edit data — undoing the
  // invalidation until the next explicit invalidate or reload. Each
  // fetch now captures the generation it started on, and only commits
  // its result to `cache` if that generation is still current.
  let generation = 0

  async function ensureLoaded() {
    if (cache) return { data: cache, error: null }
    const myGeneration = generation
    if (!inFlight) {
      inFlight = fetcher().then(res => {
        inFlight = null
        return res
      })
    }
    const { data, error } = await inFlight
    if (error) return { data: [], error }
    if (myGeneration !== generation) {
      // Invalidated while this request was in flight — don't
      // resurrect stale data. Whatever is currently cached (possibly
      // null) is returned as-is; the next call will re-fetch.
      return { data: cache || [], error: null }
    }
    cache = data || []
    return { data: cache, error: null }
  }

  function invalidate() {
    cache = null
    generation++
  }

  return { ensureLoaded, invalidate }
}
