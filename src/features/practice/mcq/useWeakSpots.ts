import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/core/contexts'
import { loadFirstTryAnswers } from '@/services/history/firstTryAnswers'
import { listFullAttempts } from '@/services/history/fullHistory'
import { computeLessonAccuracy, type LessonAccuracy } from '@/services/history/weakSpots'

// Accuracy per lesson for the given questions, from the student's first-try answers and the attempts saved on this device.
export function useWeakSpots(questions: any[]): Record<string, LessonAccuracy> {
  const { user } = useAuth() as { user: { id: string } | null }
  const userId = user?.id ?? null
  const [firstTry, setFirstTry] = useState<{ question_id: string; correct: boolean }[]>([])
  const [attempts, setAttempts] = useState<any[]>([])

  // Loads both data sources; the saved attempts work offline and for guests.
  useEffect(() => {
    let ignore = false
    loadFirstTryAnswers(userId).then(({ rows }: { rows: any[] }) => { if (!ignore) setFirstTry(rows) })
    listFullAttempts(userId).then((list: any[]) => { if (!ignore) setAttempts(list) })
    return () => { ignore = true }
  }, [userId])

  return useMemo(() => computeLessonAccuracy(questions, firstTry, attempts), [questions, firstTry, attempts])
}
