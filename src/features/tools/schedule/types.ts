// One step of a study plan; `date` is a YYYY-MM-DD string or null for "anytime".
export interface PlanItem {
  id: string
  date: string | null
  text: string
}

// A schedule row as stored in the `schedules` table.
export interface ScheduleRow {
  id: string
  title: string
  week?: string | null
  dates?: string[] | null
  url: string | null
  type: 'study' | 'exam'
  module_id: string
  items?: PlanItem[] | null
}
