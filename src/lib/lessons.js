import { supabase } from '../supabase'
import { cachedQuery, invalidateCache, REFERENCE_TTL } from './dataCache'

const KEY = 'lessons'

export async function fetchAllLessons() {
  const { data, error } = await cachedQuery(
    KEY,
    () => supabase.from('lessons').select('*').order('created_at').order('id'),
    { ttl: REFERENCE_TTL, versioned: true }
  )
  return { lessons: data || [], error }
}

export async function fetchLessonsForSubject(subjectId) {
  const { lessons, error } = await fetchAllLessons()
  if (error) return { lessons: [], error }
  return { lessons: lessons.filter(l => l.subject_id === subjectId), error: null }
}

export async function fetchLessonsForModule(moduleId) {
  const { lessons, error } = await fetchAllLessons()
  if (error) return { lessons: [], error }
  return { lessons: lessons.filter(l => l.module_id === moduleId), error: null }
}

export async function fetchLessonById(lessonId) {
  const { lessons, error } = await fetchAllLessons()
  if (error) return { lesson: null, error }
  return { lesson: lessons.find(l => l.id === lessonId) || null, error: null }
}

export function invalidateLessonsCache() {
  invalidateCache(KEY)
}
