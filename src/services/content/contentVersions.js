import { supabase } from '@/core/supabase'
import { idbGet, idbSet } from '@/core/idb'
import { markContentValidated } from '@/core/dataCache'
import { invalidateModuleContent } from '@/services/content/moduleContent'
import { invalidateSubjectsCache } from '@/services/content/subjects'
import { invalidateLessonsCache } from '@/services/content/lessons'
import { invalidateLessonStagesCache } from '@/services/content/lessonStages'
import { invalidateModuleStagesCache } from '@/services/content/moduleStages'

const STORE_KEY = 'content-versions'
const MIN_INTERVAL_MS = 60 * 1000
let lastRun = 0
let running = null

// Compares server content versions with the saved ones and clears the caches that changed.
async function run() {
  const startedAt = Date.now()
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
  if (seen) markContentValidated(startedAt)
  return refChanged
}

// Resolves true when shared reference data (modules/subjects/lessons/stages) changed.
// A forced call made while a check is running waits for it and then checks again.
export function syncContentVersions({ force = false } = {}) {
  if (running) return force ? running.then(() => syncContentVersions({ force: true })) : running
  if (!force && Date.now() - lastRun < MIN_INTERVAL_MS) return Promise.resolve(false)
  lastRun = Date.now()
  running = run().catch(() => false).finally(() => { running = null })
  return running
}
