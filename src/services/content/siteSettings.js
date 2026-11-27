import { supabase } from '@/core/supabase'
import { cachedQuery, invalidateCache, MINUTE } from '@/core/dataCache'

const KEY = 'drive-url'

// Returns the Google Drive link, saved on the device so it works offline; failed loads are never saved.
export async function fetchDriveUrl() {
  const { data } = await cachedQuery(
    KEY,
    () => supabase.from('site_settings').select('value').eq('key', 'drive_url').maybeSingle(),
    { ttl: 10 * MINUTE }
  )
  return data?.value || ''
}

// Forgets the saved link so the next read refetches it.
export function invalidateDriveUrlCache() {
  invalidateCache(KEY)
}
