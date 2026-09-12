// src/lib/subjects.js
import { supabase } from '../supabase'
import { createTableCache } from './createTableCache'

// Subjects rarely change — cached in memory for the tab's lifetime so
// ModulePage/StagePage/SubjectPage/LessonPage don't each re-fetch the
// whole table on every navigation.
const subjectsCache = createTableCache(() =>
  supabase.from('subjects').select('*').order('name')
)

export async function fetchSubjectsForModule(moduleId) {
  const { data, error } = await subjectsCache.ensureLoaded()
  return { subjects: data.filter(s => s.module_id === moduleId), error }
}

export async function fetchSubjectById(subjectId) {
  const { data, error } = await subjectsCache.ensureLoaded()
  if (error) return { subject: null, error }
  return { subject: data.find(s => s.id === subjectId) || null, error: null }
}

// Called by Admin after any subject create/update/delete so the next
// fetch gets fresh data instead of a stale in-memory copy.
export function invalidateSubjectsCache() {
  subjectsCache.invalidate()
}
