import { supabase } from '../supabase'
import { fetchAllRows } from './fetchAllRows'
import { cachedQuery, invalidateCache, MINUTE } from './dataCache'
import { idbKeys, idbDelete } from './idb'
import { storageRemove } from './safeStorage'

const QUESTIONS = 'questions:'
const ANSWER_KEYS = 'answer-keys:'
const SUMMARIES = 'summaries:'
const FACETS = 'facets:'
const FILES = 'files:'
export const SIMULATOR_KEY = 'simulator:'
const KEY_PREFIXES = [QUESTIONS, ANSWER_KEYS, SUMMARIES, FACETS, FILES, SIMULATOR_KEY]

const QUESTION_COLUMNS = 'id, question, option_a, option_b, option_c, option_d, exam_type, exam_stage, module_id, subject_id, lesson_id, source, created_at'

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

export function fetchModuleAnswerKeys(moduleId) {
  return cachedQuery(
    `${ANSWER_KEYS}${moduleId}`,
    () => fetchAllRows(() => supabase
      .rpc('get_module_answer_keys', { p_module_id: moduleId })
      .order('question_id')),
    { ttl: 30 * MINUTE, versioned: true }
  )
}

export async function loadAnswerKeys(moduleIds) {
  const ids = [...new Set(moduleIds.filter(Boolean))]
  const responses = await Promise.all(ids.map(id => fetchModuleAnswerKeys(id)))
  const keys = new Map()
  responses.forEach(({ data }) => (data || []).forEach(key => keys.set(key.question_id, key)))
  return keys
}

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

export function fetchModuleFacets(moduleId, onUpdate) {
  return cachedQuery(
    `${FACETS}${moduleId}`,
    () => supabase.rpc('get_module_content_facets', { p_module_id: moduleId }),
    { ttl: 5 * MINUTE, onUpdate, versioned: true }
  )
}

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

function removeLegacyQuestionCaches() {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith('mcq_questions_cache_') || key === 'mcq_subjects_cache' || key === 'mcq_lessons_cache')
      .forEach(key => storageRemove(key))
  } catch {
    return
  }
}

export async function pruneModuleCaches(validModuleIds) {
  removeLegacyQuestionCaches()
  const keys = await idbKeys()
  keys.forEach(key => {
    const prefix = typeof key === 'string' ? KEY_PREFIXES.find(p => key.startsWith(p)) : null
    if (prefix && !validModuleIds.has(key.slice(prefix.length))) idbDelete(key)
  })
}

export function invalidateModuleContent(moduleId) {
  KEY_PREFIXES.forEach(prefix => invalidateCache(`${prefix}${moduleId}`))
}

export async function clearAnswerKeyCaches() {
  const keys = await idbKeys()
  keys.forEach(key => { if (typeof key === 'string' && key.startsWith(ANSWER_KEYS)) invalidateCache(key) })
}

export async function clearFileCaches() {
  const keys = await idbKeys()
  keys.forEach(key => { if (typeof key === 'string' && key.startsWith(FILES)) invalidateCache(key) })
}
