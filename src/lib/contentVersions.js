import { supabase } from '../supabase'
import { idbGet, idbSet } from './idb'
import { invalidateModuleContent } from './moduleContent'
import { invalidateSubjectsCache } from './subjects'
import { invalidateLessonsCache } from './lessons'
import { invalidateLessonStagesCache } from './lessonStages'
import { invalidateModuleStagesCache } from './moduleStages'

const STORE_KEY = 'content-versions'
const MIN_INTERVAL_MS = 60 * 1000
let lastRun = 0
let running = null

async function run() {
  const { data, error } = await supabase.from('content_versions').select('scope, version')
  if (error || !data) return false
  const seen = await idbGet(STORE_KEY)
  const next = Object.fromEntries(data.map(row => [row.scope, Number(row.version)]))
  let refChanged = false
  if (seen) {
    Object.entries(next).forEach(([scope, version]) => {
      if (seen[scope] === version) return
      if (scope === 'ref') {
        refChanged = true
        invalidateSubjectsCache()
        invalidateLessonsCache()
        invalidateLessonStagesCache()
        invalidateModuleStagesCache()
      } else {
        invalidateModuleContent(scope)
      }
    })
  }
  await idbSet(STORE_KEY, next)
  return refChanged
}

// Resolves true when shared reference data (modules/subjects/lessons/stages) changed.
export function syncContentVersions({ force = false } = {}) {
  if (running) return running
  if (!force && Date.now() - lastRun < MIN_INTERVAL_MS) return Promise.resolve(false)
  lastRun = Date.now()
  running = run().catch(() => false).finally(() => { running = null })
  return running
}
