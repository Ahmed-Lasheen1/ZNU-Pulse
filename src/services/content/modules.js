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

/**
 * Modules offered in page tabs: the active ones, or every module when none is active.
 * @template {{ status?: string }} T
 * @param {T[]} modules
 * @returns {T[]}
 */
export function selectableModules(modules) {
  const active = modules.filter(m => m.status === 'active')
  return active.length > 0 ? active : modules
}

/**
 * Module a page opens: the one named in the link, else the first active one, else the first module.
 * @template {{ id: string, status?: string }} T
 * @param {T[]} modules
 * @param {string | null | undefined} moduleId
 * @returns {T | null}
 */
export function resolveModule(modules, moduleId) {
  return (moduleId && modules.find(m => m.id === moduleId)) ||
    modules.find(m => m.status === 'active') ||
    modules[0] ||
    null
}
