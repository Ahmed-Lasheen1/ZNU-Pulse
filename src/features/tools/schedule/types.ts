// Study tool a plan item can open for its lesson.
export type PlanLinkKind = 'summary' | 'practice' | 'flashcards'

// Legacy single shortcut from older plans; new plans store `lesson_id` and `tools` instead.
export interface PlanLink {
  kind: PlanLinkKind
  lesson_id: string
}

// One step of a study plan; `date` is a YYYY-MM-DD string or null for "anytime".
export interface PlanItem {
  id: string
  date: string | null
  text: string
  subject_id?: string | null
  lesson_id?: string | null
  tools?: PlanLinkKind[] | null
  note?: string | null
  link?: PlanLink | null
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
