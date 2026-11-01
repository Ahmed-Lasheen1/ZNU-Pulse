import { supabase } from '../supabase'
import { inStage } from './lessonStages'
import { cachedQuery, invalidateCache, MINUTE } from './dataCache'
import { SIMULATOR_KEY } from './moduleContent'

// Most questions a mock or practice quiz will contain.
export const QUIZ_MAX_QUESTIONS = 100

export async function fetchSimulatorConfig(moduleId) {
  const { data, error } = await cachedQuery(
    `${SIMULATOR_KEY}${moduleId}`,
    () => supabase
      .from('stage_simulator_config')
      .select('stage, subject_id, question_count')
      .eq('module_id', moduleId),
    { ttl: 30 * MINUTE, versioned: true }
  )
  return { rows: data || [], error }
}

export function invalidateSimulatorConfig(moduleId) {
  invalidateCache(`${SIMULATOR_KEY}${moduleId}`)
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

export function simulatorPool(questions, subjectId, stage, lessonStageMap, source = null) {
  return questions.filter(q =>
    q.subject_id === subjectId &&
    (q.exam_type === 'mock' || q.exam_type === 'both') &&
    inStage(q, stage, lessonStageMap) &&
    (!source || q.source === source)
  )
}

export function simulatorTotal(questions, rows, stage, lessonStageMap, source = null) {
  return rows.reduce(
    (sum, r) => sum + Math.min(r.question_count, simulatorPool(questions, r.subject_id, stage, lessonStageMap, source).length),
    0
  )
}

// Decides whether the "All questions / University Doctors only" dialog should be offered
// for a simulator run. It is offered only when a doctors-only quiz would still match the
// admin's configuration, i.e. for every subject with a quota:
//   min(quota, doctorPool) === min(quota, allPool)
// and there is a real choice to make: at least one subject has non-doctor questions in its
// pool, and at least one doctor question exists.
// Returns { allCount, doctorCount } for the dialog, or null when the dialog should be skipped.
export function simulatorSourceChoice(questions, rows, stage, lessonStageMap) {
  let allCount = 0
  let doctorCount = 0
  let hasDoctor = false
  let hasOther = false

  for (const row of rows) {
    if (!(row.question_count > 0)) continue
    const allPool = simulatorPool(questions, row.subject_id, stage, lessonStageMap, null).length
    const doctorPool = simulatorPool(questions, row.subject_id, stage, lessonStageMap, 'university').length
    const allUsed = Math.min(row.question_count, allPool)
    const doctorUsed = Math.min(row.question_count, doctorPool)

    if (doctorUsed < allUsed) return null

    allCount += allUsed
    doctorCount += doctorUsed
    if (doctorPool > 0) hasDoctor = true
    if (allPool > doctorPool) hasOther = true
  }

  if (!hasDoctor || !hasOther) return null
  return { allCount, doctorCount }
}

export function drawSimulator(questions, rows, stage, lessonStageMap, source = null) {
  return shuffle(
    rows.flatMap(r => shuffle(simulatorPool(questions, r.subject_id, stage, lessonStageMap, source)).slice(0, r.question_count))
  )
}

function groupBy(list, keyOf) {
  const groups = new Map()
  list.forEach(item => {
    const key = keyOf(item) ?? 'none'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  })
  return [...groups.values()]
}

// Splits `cap` across groups in proportion to their sizes (largest remainder).
function allocate(sizes, cap) {
  const total = sizes.reduce((a, b) => a + b, 0)
  if (total <= cap) return [...sizes]
  const exact = sizes.map(size => (size * cap) / total)
  const quotas = exact.map(Math.floor)
  const left = cap - quotas.reduce((a, b) => a + b, 0)
  exact
    .map((value, i) => ({ i, remainder: value - quotas[i] }))
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, left)
    .forEach(({ i }) => { quotas[i]++ })
  return quotas
}

// Picks at most `cap` questions, spread across subjects and then lessons in proportion to how many each has.
export function drawProportional(questions, cap = QUIZ_MAX_QUESTIONS) {
  if (questions.length <= cap) return shuffle(questions)
  const subjects = groupBy(questions, q => q.subject_id)
  const subjectQuotas = allocate(subjects.map(group => group.length), cap)
  const picked = subjects.flatMap((group, i) => {
    const lessons = groupBy(group, q => q.lesson_id)
    const lessonQuotas = allocate(lessons.map(lesson => lesson.length), subjectQuotas[i])
    return lessons.flatMap((lesson, j) => shuffle(lesson).slice(0, lessonQuotas[j]))
  })
  return shuffle(picked)
}
