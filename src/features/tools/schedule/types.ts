// Study tool a plan item can open for one lesson.
export type PlanLinkKind = 'practice' | 'flashcards'

// Optional shortcut from a plan item to a lesson's practice questions or flashcards.
export interface PlanLink {
  kind: PlanLinkKind
  lesson_id: string
}

// One step of a study plan; `date` is a YYYY-MM-DD string or null for "anytime".
export interface PlanItem {
  id: string
  date: string | null
  text: string
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
