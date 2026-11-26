import { idbKeys } from '@/core/idb'
import { fetchAllSubjects } from '@/services/content/subjects'
import { fetchAllLessons } from '@/services/content/lessons'
import { fetchLessonStageMap } from '@/services/content/lessonStages'
import { fetchModuleStages } from '@/services/content/moduleStages'
import {
  fetchModuleQuestions, fetchModuleAnswerKeys, fetchModuleFlashcards,
  fetchModuleSummaries, fetchModuleFacets, offlineCacheKeys,
} from '@/services/content/moduleContent'
import { fetchSimulatorConfig } from '@/services/exam/stageSimulator'

// Modules being downloaded right now, the status listeners, and the download run in progress.
const downloading = new Set()
const listeners = new Set()
let running = null

// Tells subscribers that a module's offline status may have changed.
function notify() {
  listeners.forEach(listener => listener())
}

// Registers a listener for offline-status changes; returns an unsubscribe function.
export function subscribeOfflineReadiness(listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

// Reports whether a module is fully saved on this device, still downloading, or not saved.
/**
 * @param {string} moduleId
 * @returns {Promise<'ready' | 'downloading' | 'missing'>}
 */
export async function getModuleOfflineStatus(moduleId) {
  if (downloading.has(moduleId)) return 'downloading'
  const present = new Set(await idbKeys())
  return Object.values(offlineCacheKeys(moduleId)).every(key => present.has(key)) ? 'ready' : 'missing'
}

// Downloads the cache entries one module is missing; returns false when a request failed.
async function downloadModule(moduleId, present) {
  const keys = offlineCacheKeys(moduleId)
  const loaders = {
    questions: () => fetchModuleQuestions(moduleId),
    answerKeys: () => fetchModuleAnswerKeys(moduleId),
    flashcards: () => fetchModuleFlashcards(moduleId),
    summaries: () => fetchModuleSummaries(moduleId),
    facets: () => fetchModuleFacets(moduleId),
    simulator: () => fetchSimulatorConfig(moduleId),
  }
  const missing = Object.keys(loaders).filter(name => !present.has(keys[name]))
  if (missing.length === 0) return true

  downloading.add(moduleId)
  notify()
  try {
    for (const name of missing) {
      const result = await loaders[name]()
      if (result?.error) return false
    }
    return true
  } catch {
    return false
  } finally {
    downloading.delete(moduleId)
    notify()
  }
}

// Makes sure the shared reference data and each module's content are saved, fetching only what is missing.
async function prefetch(moduleIds) {
  const reference = await Promise.all([fetchAllSubjects(), fetchAllLessons(), fetchLessonStageMap()])
  if (reference.some(result => result.error)) return

  await fetchModuleStages(moduleIds[0])
  const present = new Set(await idbKeys())

  for (const moduleId of moduleIds) {
    const completed = await downloadModule(moduleId, present)
    // A failure while offline would fail every later request too, so the run stops until the next trigger.
    if (!completed && !navigator.onLine) return
  }
}

// Downloads the given modules for offline use; overlapping calls share the run already in progress.
export function prefetchOfflineContent(moduleIds) {
  if (!running) {
    running = prefetch(moduleIds)
      .catch(error => console.warn('[offlineReadiness] Download stopped:', error))
      .finally(() => { running = null })
  }
  return running
}

// Starts the download when the browser is idle; skipped offline, with data saver on, or with nothing to download.
export function scheduleOfflinePrefetch(moduleIds) {
  if (moduleIds.length === 0 || !navigator.onLine || navigator.connection?.saveData) return
  const start = () => { prefetchOfflineContent(moduleIds) }
  if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 10000 })
  else setTimeout(start, 3000)
}
