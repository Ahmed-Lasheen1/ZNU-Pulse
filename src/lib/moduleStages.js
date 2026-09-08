import { supabase } from '../supabase'
import { EXAM_STAGES as DEFAULT_STAGES, FALLBACK_STAGE } from './examStages'
import { PinIcon } from '../components/ui/tool-icons'

// AUDIT FIX: this used to run a fresh `module_exam_stages` query on
// every single call, with zero caching — unlike subjects.js and
// lessons.js, which already solve the identical "small table, read
// constantly, changes rarely" problem by loading the whole table once
// and filtering in memory. fetchModuleStages() is called from MCQ,
// StagePage, Summaries (per-module drill-down), and three separate
// Admin tabs (Questions/Files/Summaries) every time their module
// selection changes — so this was one of the most frequently repeated
// avoidable network round trips in the app. Same pattern as the other
// two caches now: load once, filter in memory, invalidate explicitly
// when an admin actually changes something.
let cache = null
let inFlight = null

async function ensureLoaded() {
  if (cache) return { rows: cache, error: null }
  if (!inFlight) {
    inFlight = supabase
      .from('module_exam_stages')
      .select('module_id, value, title, emoji, color, position')
      .order('position')
      .then(res => {
        inFlight = null
        return res
      })
  }
  const { data, error } = await inFlight
  if (error) return { rows: [], error }
  cache = data || []
  return { rows: cache, error: null }
}

// A module with no rows in module_exam_stages just uses the 4 global
// defaults — nothing to set up, nothing that can break. Once an admin
// saves a custom set for a module (see Admin.jsx "Stages" tab), that
// module always uses its own set from then on. Ordering the whole
// table by `position` and then filtering to this module preserves
// each module's own relative order, since filtering an already-sorted
// array never reorders what's left.
export async function fetchModuleStages(moduleId) {
  if (!moduleId) return DEFAULT_STAGES
  const { rows, error } = await ensureLoaded()
  if (error) return DEFAULT_STAGES
  const forModule = rows.filter(r => r.module_id === moduleId)
  return forModule.length > 0 ? forModule : DEFAULT_STAGES
}

// Called by Admin's Stages tab after any save/reset so everyone who
// navigates right after an edit — including the admin who just made
// it, in the same session — gets fresh data instead of a stale
// in-memory copy for the rest of their session. Same convention as
// invalidateSubjectsCache / invalidateLessonsCache in Admin.jsx.
export function invalidateModuleStagesCache() {
  cache = null
}

export function stageMetaFrom(stages, value) {
  return stages.find(s => s.value === value) || FALLBACK_STAGE
}
