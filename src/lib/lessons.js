// src/lib/lessons.js
import { supabase } from '../supabase'
import { createTableCache } from './createTableCache'

const lessonsCache = createTableCache(() => supabase.from('lessons').select('*'))

export async function fetchLessonsForSubject(subjectId) {
  const { data, error } = await lessonsCache.ensureLoaded()
  if (error) return { lessons: [], error }
  const filtered = data
    .filter(l => l.subject_id === subjectId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return { lessons: filtered, error: null }
}

// Used by ModulePage/StagePage's lesson accordion.
export async function fetchLessonsForModule(moduleId) {
  const { data, error } = await lessonsCache.ensureLoaded()
  if (error) return { lessons: [], error }
  return { lessons: data.filter(l => l.module_id === moduleId), error: null }
}

export async function fetchLessonById(lessonId) {
  const { data, error } = await lessonsCache.ensureLoaded()
  if (error) return { lesson: null, error }
  return { lesson: data.find(l => l.id === lessonId) || null, error: null }
}

export function invalidateLessonsCache() {
  lessonsCache.invalidate()
}
