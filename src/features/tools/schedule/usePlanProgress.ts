import { useEffect, useState } from 'react'
import { useAuth } from '@/core/contexts'
import { fetchModuleFlashcards, fetchModuleQuestions } from '@/services/content/moduleContent'
import { loadFirstTryAnswers } from '@/services/history/firstTryAnswers'
import { loadProgress } from '@/services/flashcards/progress'
import type { ScheduleRow } from '@/features/tools/schedule/types'

// Share of a lesson's questions a student must have answered for its practice step to count as done.
const PRACTICE_COVERAGE = 0.8

const NONE: ReadonlySet<string> = new Set()

// Ids of the plan items completed by actual study: practice steps once most of the lesson's questions were answered,
// flashcard steps once every card of the lesson was studied. Only loads data when the plan has linked items and `enabled`.
export function usePlanProgress(schedule: ScheduleRow, enabled: boolean): ReadonlySet<string> {
  const { user } = useAuth() as { user: { id: string } | null }
  const userId = user?.id ?? null
  const [completed, setCompleted] = useState<ReadonlySet<string>>(NONE)

  // Reads the cached questions, cards and progress, then marks every linked item that meets its goal.
  useEffect(() => {
    const linked = (schedule.items || []).filter(item => item.link)
    if (!enabled || linked.length === 0) return
    let ignore = false
    const needsPractice = linked.some(item => item.link?.kind === 'practice')
    const needsCards = linked.some(item => item.link?.kind === 'flashcards')

    async function load() {
      const [questionsRes, firstTryRes, cardsRes, progress]: any[] = await Promise.all([
        needsPractice ? fetchModuleQuestions(schedule.module_id) : null,
        needsPractice ? loadFirstTryAnswers(userId) : null,
        needsCards ? fetchModuleFlashcards(schedule.module_id) : null,
        needsCards ? loadProgress(userId, schedule.module_id) : null,
      ])
      if (ignore) return

      const answered = new Set<string>((firstTryRes?.rows || []).map((row: any) => row.question_id))
      const done = new Set<string>()
      linked.forEach(item => {
        const link = item.link!
        if (link.kind === 'practice') {
          const lessonQuestions = ((questionsRes?.data || []) as any[]).filter(q => q.lesson_id === link.lesson_id)
          const answeredCount = lessonQuestions.filter(q => answered.has(q.id)).length
          if (lessonQuestions.length > 0 && answeredCount >= Math.ceil(lessonQuestions.length * PRACTICE_COVERAGE)) done.add(item.id)
        } else {
          const lessonCards = ((cardsRes?.data || []) as any[]).filter(c => c.lesson_id === link.lesson_id)
          if (lessonCards.length > 0 && lessonCards.every(c => progress?.[c.id])) done.add(item.id)
        }
      })
      setCompleted(done)
    }
    load()
    return () => { ignore = true }
  }, [enabled, schedule.id, schedule.module_id, schedule.items, userId])

  return completed
}
