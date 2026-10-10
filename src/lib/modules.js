import { supabase } from '../supabase'
import { cachedQuery, invalidateCache, MINUTE } from './dataCache'

const KEY = 'modules'

// The query itself already orders active-before-completed (alphabetical) and
// created_at descending within each, so no client-side re-sort is needed.
const fetchRows = () => supabase
  .from('modules')
  .select('*')
  .order('status')
  .order('created_at', { ascending: false })

export async function fetchModulesSorted({ force = false, onRevalidated } = {}) {
  if (force) invalidateCache(KEY)
  const { data, error } = await cachedQuery(KEY, fetchRows, {
    ttl: 5 * MINUTE,
    onUpdate: result => { if (!result.error) onRevalidated?.(result.data) },
  })
  return { modules: data || [], error }
}
