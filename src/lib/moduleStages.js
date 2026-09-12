// src/lib/moduleStages.js
import { supabase } from '../supabase'
import { createTableCache } from './createTableCache'
import { EXAM_STAGES as DEFAULT_STAGES, FALLBACK_STAGE } from './examStages'

// Same shared-cache pattern as subjects.js/lessons.js.
const stagesCache = createTableCache(() =>
  supabase
    .from('module_exam_stages')
    .select('module_id, value, title, emoji, color, position')
    .order('position')
)

// A module with no custom rows just uses the 4 global defaults. Once
// an admin saves a custom set (Admin's Stages tab), that module uses
// its own set from then on. Ordering the whole table by `position`
// first preserves each module's relative order once filtered.
export async function fetchModuleStages(moduleId) {
  if (!moduleId) return DEFAULT_STAGES
  const { data, error } = await stagesCache.ensureLoaded()
  if (error) return DEFAULT_STAGES
  const forModule = data.filter(r => r.module_id === moduleId)
  return forModule.length > 0 ? forModule : DEFAULT_STAGES
}

// Called by Admin's Stages tab after any save/reset.
export function invalidateModuleStagesCache() {
  stagesCache.invalidate()
}

export function stageMetaFrom(stages, value) {
  return stages.find(s => s.value === value) || FALLBACK_STAGE
}
