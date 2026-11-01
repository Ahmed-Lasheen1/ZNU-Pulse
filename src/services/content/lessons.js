import { supabase } from '@/core/supabase'
import { cachedQuery, invalidateCache, REFERENCE_TTL } from '@/core/dataCache'

const KEY = 'lessons'

// Loads every lesson, cached.
export async function fetchAllLessons() {
  const { data, error } = await cachedQuery(
    KEY,
    () => supabase.from('lessons').select('*').order('created_at').order('id'),
    { ttl: REFERENCE_TTL, versioned: true }
  )
  return { lessons: data || [], error }
}

// Loads the lessons of one module.
export async function fetchLessonsForModule(moduleId) {
  const { lessons, error } = await fetchAllLessons()
  if (error) return { lessons: [], error }
  return { lessons: lessons.filter(l => l.module_id === moduleId), error: null }
}

// Clears the cached lessons.
export function invalidateLessonsCache() {
  invalidateCache(KEY)
}
