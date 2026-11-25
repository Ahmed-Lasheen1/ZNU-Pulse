// Share of a lesson's questions a student must have answered for its practice step to count as done.
export const PRACTICE_COVERAGE = 0.8

// True when most of the lesson's questions were answered on the first try.
export function practiceDone(lessonQuestions: { id: string }[], answered: ReadonlySet<string>) {
  if (lessonQuestions.length === 0) return false
  const answeredCount = lessonQuestions.filter(q => answered.has(q.id)).length
  return answeredCount >= Math.ceil(lessonQuestions.length * PRACTICE_COVERAGE)
}

// True when every card of the lesson was studied.
export function cardsDone(lessonCards: { id: string }[], progress: Record<string, unknown> | null | undefined) {
  return lessonCards.length > 0 && lessonCards.every(card => progress?.[card.id])
}
