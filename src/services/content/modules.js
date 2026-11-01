import { supabase } from '@/core/supabase'
import { cachedQuery, invalidateCache, MINUTE } from '@/core/dataCache'

const KEY = 'modules'

// The query itself already orders active-before-completed (alphabetical) and
// created_at descending within each, so no client-side re-sort is needed.
const fetchRows = () => supabase
  .from('modules')
  .select('*')
  .order('status')
  .order('created_at', { ascending: false })

// Loads all modules (active first), cached and revalidated in the background.
export async function fetchModulesSorted({ force = false, onRevalidated } = {}) {
  if (force) invalidateCache(KEY)
  const { data, error } = await cachedQuery(KEY, fetchRows, {
    ttl: 5 * MINUTE,
    versioned: true,
    onUpdate: result => { if (!result.error) onRevalidated?.(result.data) },
  })
  return { modules: data || [], error }
}
