import { supabase } from '../supabase'
import { inStage } from './lessonStages'

export async function fetchSimulatorConfig(moduleId) {
  const { data, error } = await supabase
    .from('stage_simulator_config')
    .select('stage, subject_id, question_count')
    .eq('module_id', moduleId)
  return { rows: data || [], error }
}

// Fisher-Yates (unbiased), returns a new array.
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function simulatorPool(questions, subjectId, stage, lessonStageMap) {
  return questions.filter(q =>
    q.subject_id === subjectId &&
    (q.exam_type === 'mock' || q.exam_type === 'both') &&
    inStage(q, stage, lessonStageMap)
  )
}

export function drawSimulator(questions, rows, stage, lessonStageMap) {
  return shuffle(
    rows.flatMap(r => shuffle(simulatorPool(questions, r.subject_id, stage, lessonStageMap)).slice(0, r.question_count))
  )
}
