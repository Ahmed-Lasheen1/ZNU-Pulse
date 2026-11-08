// Fewest answers a lesson needs before its accuracy is trusted.
export const MIN_ANSWERS = 5
// How many of the newest answers per lesson count as "recent".
export const RECENT_ANSWERS = 10
// Lessons scoring below this percentage are shown as weak spots.
export const WEAK_BELOW = 70

export interface LessonAccuracy {
  accuracy: number
  answered: number
}

interface Tally {
  answered: number
  correct: number
}

interface FirstTryRow {
  question_id: string
  correct: boolean
}

interface SavedAttempt {
  questions: { lesson_id?: string | null; answer?: string | null; is_correct?: boolean }[]
}

// Adds one answer to a lesson's running tally.
function addAnswer(tallies: Record<string, Tally>, lessonId: string, correct: boolean) {
  const tally = tallies[lessonId] || (tallies[lessonId] = { answered: 0, correct: 0 })
  tally.answered++
  if (correct) tally.correct++
}

// Accuracy per lesson: the newest answers from saved attempts when there are enough, otherwise the student's first-try answers.
// Attempts must be ordered newest first. Lessons with too few answers are left out.
export function computeLessonAccuracy(
  questions: { id: string; lesson_id?: string | null }[],
  firstTryRows: FirstTryRow[],
  recentAttempts: SavedAttempt[]
): Record<string, LessonAccuracy> {
  const lessonOf = new Map<string, string>()
  questions.forEach(q => { if (q.lesson_id) lessonOf.set(q.id, q.lesson_id) })

  const firstTry: Record<string, Tally> = {}
  firstTryRows.forEach(row => {
    const lessonId = lessonOf.get(row.question_id)
    if (lessonId) addAnswer(firstTry, lessonId, row.correct)
  })

  const recent: Record<string, Tally> = {}
  recentAttempts.forEach(attempt => {
    attempt.questions.forEach(item => {
      if (!item.lesson_id || !item.answer) return
      if ((recent[item.lesson_id]?.answered ?? 0) >= RECENT_ANSWERS) return
      addAnswer(recent, item.lesson_id, !!item.is_correct)
    })
  })

  const result: Record<string, LessonAccuracy> = {}
  new Set([...Object.keys(firstTry), ...Object.keys(recent)]).forEach(lessonId => {
    const tally = (recent[lessonId]?.answered ?? 0) >= MIN_ANSWERS ? recent[lessonId] : firstTry[lessonId]
    if (!tally || tally.answered < MIN_ANSWERS) return
    result[lessonId] = { accuracy: Math.round((100 * tally.correct) / tally.answered), answered: tally.answered }
  })
  return result
}
