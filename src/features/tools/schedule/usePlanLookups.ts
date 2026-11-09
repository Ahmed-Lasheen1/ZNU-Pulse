import { useEffect, useState } from 'react'
import { fetchSubjectsForModule } from '@/services/content/subjects'
import { fetchLessonsForModule } from '@/services/content/lessons'
import { fetchModuleSummaries } from '@/services/content/moduleContent'

export interface PlanSubject { id: string; name: string; icon?: string | null; color?: string | null }
export interface PlanLesson { id: string; title: string; subject_id: string }
export interface PlanSummary { id: string; title: string }

export interface PlanLookups {
  loaded: boolean
  subjects: PlanSubject[]
  lessons: PlanLesson[]
  summariesByLesson: Record<string, PlanSummary[]>
}

const EMPTY: PlanLookups = { loaded: false, subjects: [], lessons: [], summariesByLesson: {} }

// Loads the subjects, lessons and summaries a study plan needs to group and open its items.
export function usePlanLookups(moduleId: string, enabled: boolean): PlanLookups {
  const [lookups, setLookups] = useState<PlanLookups>(EMPTY)

  useEffect(() => {
    if (!enabled) return
    let ignore = false
    Promise.all([
      fetchSubjectsForModule(moduleId),
      fetchLessonsForModule(moduleId),
      fetchModuleSummaries(moduleId),
    ]).then(([subjectsRes, lessonsRes, summariesRes]: any[]) => {
      if (ignore) return
      const summariesByLesson: Record<string, PlanSummary[]> = {}
      ;((summariesRes.data || []) as any[]).forEach(s => {
        if (!s.lesson_id) return
        ;(summariesByLesson[s.lesson_id] ||= []).push({ id: s.id, title: s.title })
      })
      setLookups({ loaded: true, subjects: subjectsRes.subjects, lessons: lessonsRes.lessons, summariesByLesson })
    })
    return () => { ignore = true }
  }, [moduleId, enabled])

  return lookups
}
