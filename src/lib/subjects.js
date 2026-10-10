import { supabase } from '../supabase'
import { cachedQuery, invalidateCache, REFERENCE_TTL } from './dataCache'

const KEY = 'subjects'

export async function fetchAllSubjects() {
  const { data, error } = await cachedQuery(
    KEY,
    () => supabase.from('subjects').select('*').order('name'),
    { ttl: REFERENCE_TTL }
  )
  return { subjects: data || [], error }
}

export async function fetchSubjectsForModule(moduleId) {
  const { subjects, error } = await fetchAllSubjects()
  return { subjects: subjects.filter(s => s.module_id === moduleId), error }
}

export async function fetchSubjectById(subjectId) {
  const { subjects, error } = await fetchAllSubjects()
  if (error) return { subject: null, error }
  return { subject: subjects.find(s => s.id === subjectId) || null, error: null }
}

// Called by Admin after any subject create/update/delete.
export function invalidateSubjectsCache() {
  invalidateCache(KEY)
}
