import { supabase } from '@/core/supabase'
import { fetchAllRows } from '@/core/fetchAllRows'
import { cachedQuery, invalidateCache, MINUTE } from '@/core/dataCache'
import { idbKeys, idbDelete } from '@/core/idb'
import { storageRemove } from '@/core/safeStorage'

const QUESTIONS = 'questions:'
const ANSWER_KEYS = 'answer-keys:'
const SUMMARIES = 'summaries:'
const FACETS = 'facets:'
const FILES = 'files:'
export const SIMULATOR_KEY = 'simulator:'
const KEY_PREFIXES = [QUESTIONS, ANSWER_KEYS, SUMMARIES, FACETS, FILES, SIMULATOR_KEY]

const QUESTION_COLUMNS = 'id, question, option_a, option_b, option_c, option_d, exam_type, exam_stage, module_id, subject_id, lesson_id, source, created_at'

// Loads a module's questions (without answers), cached for 30 minutes.
export function fetchModuleQuestions(moduleId, onUpdate) {
  return cachedQuery(
    `${QUESTIONS}${moduleId}`,
    () => fetchAllRows(() => supabase
      .from('questions_public')
      .select(QUESTION_COLUMNS)
      .eq('module_id', moduleId)
      .order('created_at')
      .order('id')),
    { ttl: 30 * MINUTE, onUpdate, versioned: true }
  )
}

// Loads a module's correct answers and explanations for local grading.
export function fetchModuleAnswerKeys(moduleId) {
  return cachedQuery(
    `${ANSWER_KEYS}${moduleId}`,
    () => fetchAllRows(() => supabase
      .rpc('get_module_answer_keys', { p_module_id: moduleId })
      .order('question_id')),
    { ttl: 30 * MINUTE, versioned: true }
  )
}

// Loads answer keys for several modules into one lookup by question id.
export async function loadAnswerKeys(moduleIds) {
  const ids = [...new Set(moduleIds.filter(Boolean))]
  const responses = await Promise.all(ids.map(id => fetchModuleAnswerKeys(id)))
  const keys = new Map()
  responses.forEach(({ data }) => (data || []).forEach(key => keys.set(key.question_id, key)))
  return keys
}

// Loads a module's summaries, cached.
export function fetchModuleSummaries(moduleId, onUpdate) {
  return cachedQuery(
    `${SUMMARIES}${moduleId}`,
    () => fetchAllRows(() => supabase
      .from('summaries')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at')
      .order('id')),
    { ttl: 10 * MINUTE, onUpdate, versioned: true }
  )
}

// Loads the content facets (kind, type, stage, lesson) that decide what a module page shows.
export function fetchModuleFacets(moduleId, onUpdate) {
  return cachedQuery(
    `${FACETS}${moduleId}`,
    () => supabase.rpc('get_module_content_facets', { p_module_id: moduleId }),
    { ttl: 5 * MINUTE, onUpdate, versioned: true }
  )
}

// Loads a module's files, newest first, cached.
export function fetchModuleFiles(moduleId, onUpdate) {
  return cachedQuery(
    `${FILES}${moduleId}`,
    () => fetchAllRows(() => supabase
      .from('files')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false })
      .order('id')),
    { ttl: 10 * MINUTE, onUpdate, versioned: true }
  )
}

// Deletes question caches that older versions left in localStorage.
function removeLegacyQuestionCaches() {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith('mcq_questions_cache_') || key === 'mcq_subjects_cache' || key === 'mcq_lessons_cache')
      .forEach(key => storageRemove(key))
  } catch {
    return
  }
}

// Deletes cached content of modules that no longer exist.
export async function pruneModuleCaches(validModuleIds) {
  removeLegacyQuestionCaches()
  const keys = await idbKeys()
  keys.forEach(key => {
    const prefix = typeof key === 'string' ? KEY_PREFIXES.find(p => key.startsWith(p)) : null
    if (prefix && !validModuleIds.has(key.slice(prefix.length))) idbDelete(key)
  })
}

// Clears every cached content type of one module.
export function invalidateModuleContent(moduleId) {
  KEY_PREFIXES.forEach(prefix => invalidateCache(`${prefix}${moduleId}`))
}

// Clears all cached answer keys (used on sign-out).
export async function clearAnswerKeyCaches() {
  const keys = await idbKeys()
  keys.forEach(key => { if (typeof key === 'string' && key.startsWith(ANSWER_KEYS)) invalidateCache(key) })
}

// Clears all cached file lists.
export async function clearFileCaches() {
  const keys = await idbKeys()
  keys.forEach(key => { if (typeof key === 'string' && key.startsWith(FILES)) invalidateCache(key) })
}
