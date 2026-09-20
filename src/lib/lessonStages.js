// src/lib/lessonStages.js
import { supabase } from '../supabase'
import { createTableCache } from './createTableCache'

// A lesson can be assigned several exam stages (lesson_exam_stages,
// one row per lesson+stage pair). Everything tagged to that lesson
// then also belongs to those stages, without copying any rows.
const lessonStagesCache = createTableCache(() =>
  supabase.from('lesson_exam_stages').select('lesson_id, stage')
)

// lesson_id -> array of stage values. On error the map is empty, so
// pages simply fall back to each item's own exam_stage tag.
export async function fetchLessonStageMap() {
  const { data, error } = await lessonStagesCache.ensureLoaded()
  const map = {}
  data.forEach(row => {
    if (!map[row.lesson_id]) map[row.lesson_id] = []
    map[row.lesson_id].push(row.stage)
  })
  return { map, error }
}

// Called by Admin after any lesson-stage change.
export function invalidateLessonStagesCache() {
  lessonStagesCache.invalidate()
}

// All stages an item belongs to: its own tag plus its lesson's stages.
export function stagesOf(item, map) {
  const own = item.exam_stage || 'general'
  const viaLesson = item.lesson_id ? map[item.lesson_id] : null
  return viaLesson ? [own, ...viaLesson] : [own]
}

// One yes/no per item, so an item matching through both its own tag
// and its lesson is still listed once.
export function inStage(item, stage, map) {
  if (stage === 'all') return true
  return stagesOf(item, map).includes(stage)
}
