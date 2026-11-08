import { daysFromToday } from '@/features/tools/schedule'

interface ExamScheduleRow {
  id: string
  title: string
  dates?: string[] | null
  module_id: string
}

export interface UpcomingExam {
  id: string
  title: string
  moduleId: string
  moduleName: string
  days: number
}

// Picks the exam date closest to today (today included) among the given modules; null when none is coming up.
export function nextUpcomingExam(rows: ExamScheduleRow[], modules: { id: string; name: string }[]): UpcomingExam | null {
  let best: UpcomingExam | null = null
  rows.forEach(row => {
    const module = modules.find(m => m.id === row.module_id)
    if (!module) return
    ;(row.dates || []).forEach(date => {
      const days = daysFromToday(date)
      if (days >= 0 && (!best || days < best.days)) {
        best = { id: row.id, title: row.title, moduleId: module.id, moduleName: module.name, days }
      }
    })
  })
  return best
}
