// src/lib/lessons.js
import { supabase } from '../supabase'
import { createTableCache } from './createTableCache'

// Same shared-cache pattern as subjects.js. (MCQ.tsx keeps its own
// separate localStorage-based lessons cache for offline support —
// left untouched here.)
const lessonsCache = createTableCache(() => supabase.from('lessons').select('*'))

export async function fetchLessonsForSubject(subjectId) {
  const { data, error } = await lessonsCache.ensureLoaded()
  if (error) return { lessons: [], error }
  const filtered = data
    .filter(l => l.subject_id === subjectId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return { lessons: filtered, error: null }
}

export async function fetchLessonById(lessonId) {
  const { data, error } = await lessonsCache.ensureLoaded()
  if (error) return { lesson: null, error }
  return { lesson: data.find(l => l.id === lessonId) || null, error: null }
}

// Called by Admin after any lesson create/update/delete.
export function invalidateLessonsCache() {
  lessonsCache.invalidate()
}
