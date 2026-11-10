import { useEffect, useState } from 'react'
import { useAuth } from '@/core/contexts'
import { fetchModuleFlashcards, fetchModuleQuestions } from '@/services/content/moduleContent'
import { loadFirstTryAnswers } from '@/services/history/firstTryAnswers'
import { loadProgress } from '@/services/flashcards/progress'
import { itemLessonId, itemTools } from '@/features/tools/schedule/planItems'
import type { ScheduleRow } from '@/features/tools/schedule/types'

// Share of a lesson's questions a student must have answered for its practice step to count as done.
const PRACTICE_COVERAGE = 0.8

const NONE: ReadonlySet<string> = new Set()

// Ids of the plan items completed by actual study: practice once most of the lesson's questions were answered,
// flashcards once every card of the lesson was studied. An item is done when all its trackable tools are done
// (summaries can't be tracked). Only loads data when the plan has such items and `enabled`.
export function usePlanProgress(schedule: ScheduleRow, enabled: boolean): ReadonlySet<string> {
  const { user } = useAuth() as { user: { id: string } | null }
  const userId = user?.id ?? null
  const [completed, setCompleted] = useState<ReadonlySet<string>>(NONE)

  // Reads the cached questions, cards and progress, then marks every item that meets its goals.
  useEffect(() => {
    const tracked = (schedule.items || []).filter(item => itemLessonId(item) && itemTools(item).some(t => t !== 'summary'))
    // Nothing to track (anymore): drop any ticks left over from earlier items.
    if (!enabled || tracked.length === 0) {
      setCompleted(NONE)
      return
    }
    let ignore = false
    const needsPractice = tracked.some(item => itemTools(item).includes('practice'))
    const needsCards = tracked.some(item => itemTools(item).includes('flashcards'))

    async function load() {
      const [questionsRes, firstTryRes, cardsRes, progress]: any[] = await Promise.all([
        needsPractice ? fetchModuleQuestions(schedule.module_id) : null,
        needsPractice ? loadFirstTryAnswers(userId) : null,
        needsCards ? fetchModuleFlashcards(schedule.module_id) : null,
        needsCards ? loadProgress(userId, schedule.module_id) : null,
      ])
      if (ignore) return

      const answered = new Set<string>((firstTryRes?.rows || []).map((row: any) => row.question_id))

      // True when most of the lesson's questions were answered.
      const practiceDone = (lessonId: string) => {
        const lessonQuestions = ((questionsRes?.data || []) as any[]).filter(q => q.lesson_id === lessonId)
        const answeredCount = lessonQuestions.filter(q => answered.has(q.id)).length
        return lessonQuestions.length > 0 && answeredCount >= Math.ceil(lessonQuestions.length * PRACTICE_COVERAGE)
      }
      // True when every card of the lesson was studied.
      const cardsDone = (lessonId: string) => {
        const lessonCards = ((cardsRes?.data || []) as any[]).filter(c => c.lesson_id === lessonId)
        return lessonCards.length > 0 && lessonCards.every(c => progress?.[c.id])
      }

      const done = new Set<string>()
      tracked.forEach(item => {
        const lessonId = itemLessonId(item) as string
        const tools = itemTools(item)
        const ok = (!tools.includes('practice') || practiceDone(lessonId)) && (!tools.includes('flashcards') || cardsDone(lessonId))
        if (ok) done.add(item.id)
      })
      setCompleted(done)
    }
    load()
    return () => { ignore = true }
  }, [enabled, schedule.id, schedule.module_id, schedule.items, userId])

  return completed
}
