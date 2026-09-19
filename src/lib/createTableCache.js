// src/lib/createTableCache.js
// "Load once, cache in memory, invalidate on demand" — shared by
// subjects.js, lessons.js, and moduleStages.js.
export function createTableCache(fetcher) {
  let cache = null
  let inFlight = null
  // Generation the CURRENT inFlight promise was started under — lets
  // a new caller tell a stale in-flight fetch apart from a fresh one.
  let inFlightGeneration = -1
  let generation = 0

  async function ensureLoaded() {
    if (cache) return { data: cache, error: null }
    const myGeneration = generation
    // Only reuse inFlight if it started under the CURRENT generation.
    // Otherwise invalidate() ran while it was mid-flight — reusing it
    // would silently resurrect pre-invalidation data once it resolves.
    if (!inFlight || inFlightGeneration !== myGeneration) {
      inFlightGeneration = myGeneration
      inFlight = fetcher().then(res => {
        inFlight = null
        return res
      })
    }
    const { data, error } = await inFlight
    if (error) return { data: [], error }
    if (myGeneration !== generation) {
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
