import type { CSSProperties, ReactNode } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import type { AdminModule } from '@/features/admin/common/adminTypes'

export interface UserStats {
  total: number
  new_7d: number
  new_prev_7d: number
  active_today: number
  active_7d: number
  active_prev_7d: number
  active_30d: number
  never_active: number
  at_risk: number
}

export interface DailyPoint {
  day: string
  active: number
  quizzes: number
  answers: number
  signups: number
}

export interface Performance {
  quizzes: number
  quizzes_prev: number
  questions: number
  accuracy: number | null
  accuracy_prev: number | null
  by_type: Record<string, number>
}

export interface ModuleStat {
  id: string
  name: string
  icon: string | null
  color: string
  status: string
  subjects: number
  lessons: number
  lessons_without_questions: number
  questions: number
  summaries: number
  files: number
  quizzes: number
  students: number
  accuracy: number | null
}

export interface WeakSubject {
  id: string
  name: string
  module_id: string
  attempted: number
  accuracy: number
}

export interface FlaggedQuestion {
  id: string
  question: string
  module_id: string
  flags: number
}

export interface AnalyticsData {
  days: number
  users: UserStats
  daily: DailyPoint[]
  performance: Performance
  modules: ModuleStat[]
  weak_subjects: WeakSubject[]
  most_flagged: FlaggedQuestion[]
  qna: { total: number; unanswered: number; oldest_unanswered: string | null }
  adoption: {
    quiz_takers: number
    push_users: number
    push_devices: number
    checklist_users: number
    checklist_total: number
    checklist_done: number
    paused_exams: number
  }
  content: { questions: number; summaries: number; files: number; by_source: Record<string, number> }
  hourly: number[]
  weekday: number[]
}

export interface DifficultyRow {
  id: string
  question: string
  module_id: string
  incorrect_count: number
  total_attempts: number
  error_rate: number
}

export interface DifficultyState {
  rows: DifficultyRow[]
  loading: boolean
  error: boolean
}

export interface AnalyticsSectionProps {
  dark: boolean
  data: AnalyticsData
}

export const MISSING_FUNCTION_CODE = 'PGRST202'
export const MISSING_FUNCTION_MESSAGE = 'Analytics is not installed yet — run supabase/admin_analytics.sql once in the Supabase SQL editor.'

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const cardGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
  gap: 16,
  marginBottom: 16,
}

export const statRow: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 16,
}

export function indexOfMax(values: number[]) {
  return values.some(v => v > 0) ? values.indexOf(Math.max(...values)) : -1
}

export function daysSince(timestamp: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 86400000))
}

export function moduleNameOf(modules: AdminModule[], id: string) {
  return modules.find(m => m.id === id)?.name ?? ''
}

export function EmptyNote({ dark, children }: { dark: boolean; children: ReactNode }) {
  const pt = getPulseTheme(dark)
  return <p style={{ color: pt.textMuted, fontSize: 13 }}>{children}</p>
}
