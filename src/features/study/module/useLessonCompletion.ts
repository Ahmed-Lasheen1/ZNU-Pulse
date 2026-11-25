import { useEffect, useState } from 'react'
import { useAuth } from '@/core/contexts'
import { fetchModuleFlashcards, fetchModuleQuestions } from '@/services/content/moduleContent'
import { loadFirstTryAnswers } from '@/services/history/firstTryAnswers'
import { loadProgress } from '@/services/flashcards/progress'
import { cardsDone, practiceDone } from '@/services/history/lessonProgress'

const NONE: ReadonlySet<string> = new Set()

// Ids of lessons completed by study: all their trackable parts (practice, flashcards) are done.
// Lessons with neither questions nor cards stay manual. Guests have no first-try answers, so practice never completes for them.
export function useLessonCompletion(moduleId: string, lessonIds: string[]): ReadonlySet<string> {
  const { user } = useAuth() as { user: { id: string } | null }
  const userId = user?.id ?? null
  const [completed, setCompleted] = useState<ReadonlySet<string>>(NONE)
  const idsKey = lessonIds.join('|')

  // Reads the cached questions, cards and progress, then marks every lesson that meets its goals.
  useEffect(() => {
    if (!idsKey) {
      setCompleted(NONE)
      return
    }
    let ignore = false

    async function load() {
      const [questionsRes, firstTryRes, cardsRes, progress]: any[] = await Promise.all([
        fetchModuleQuestions(moduleId),
        loadFirstTryAnswers(userId),
        fetchModuleFlashcards(moduleId),
        loadProgress(userId, moduleId),
      ])
      if (ignore) return

      const answered = new Set<string>((firstTryRes?.rows || []).map((row: any) => row.question_id))
      const questions: any[] = questionsRes?.data || []
      const cards: any[] = cardsRes?.data || []

      const done = new Set<string>()
      idsKey.split('|').forEach(lessonId => {
        const lessonQuestions = questions.filter(q => q.lesson_id === lessonId)
        const lessonCards = cards.filter(c => c.lesson_id === lessonId)
        if (lessonQuestions.length === 0 && lessonCards.length === 0) return
        const practiceOk = lessonQuestions.length === 0 || practiceDone(lessonQuestions, answered)
        const cardsOk = lessonCards.length === 0 || cardsDone(lessonCards, progress)
        if (practiceOk && cardsOk) done.add(lessonId)
      })
      setCompleted(done)
    }
    load()
    return () => { ignore = true }
  }, [moduleId, userId, idsKey])

  return completed
}
