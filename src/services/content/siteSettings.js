import { supabase } from '@/core/supabase'

// Shared cache for the single "drive_url" site setting — ModulePage
// and StagePage both used to query this independently on every visit.
let cache = null
let inFlight = null

// Returns the Google Drive link setting, fetched once and shared.
export async function fetchDriveUrl() {
  if (cache !== null) return cache
  if (!inFlight) {
    inFlight = supabase.from('site_settings').select('value').eq('key', 'drive_url').maybeSingle()
      .then(({ data }) => {
        cache = data?.value || ''
        inFlight = null
        return cache
      })
  }
  return inFlight
}

// Forgets the cached link so the next read refetches it.
export function invalidateDriveUrlCache() {
  cache = null
}
