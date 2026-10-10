import { supabase } from '../supabase'
import { cachedQuery, invalidateCache, REFERENCE_TTL } from './dataCache'
import { EXAM_STAGES as DEFAULT_STAGES, FALLBACK_STAGE } from './examStages'

const KEY = 'module-stages'

// A module with no custom rows just uses the 4 global defaults. Once
// an admin saves a custom set (Admin's Stages tab), that module uses
// its own set from then on. Ordering the whole table by `position`
// first preserves each module's relative order once filtered.
export async function fetchModuleStages(moduleId) {
  if (!moduleId) return DEFAULT_STAGES
  const { data, error } = await cachedQuery(
    KEY,
    () => supabase
      .from('module_exam_stages')
      .select('module_id, value, title, emoji, color, position')
      .order('position'),
    { ttl: REFERENCE_TTL }
  )
  if (error) return DEFAULT_STAGES
  const forModule = data.filter(r => r.module_id === moduleId)
  return forModule.length > 0 ? forModule : DEFAULT_STAGES
}

// Called by Admin's Stages tab after any save/reset.
export function invalidateModuleStagesCache() {
  invalidateCache(KEY)
}

export function stageMetaFrom(stages, value) {
  return stages.find(s => s.value === value) || FALLBACK_STAGE
}
