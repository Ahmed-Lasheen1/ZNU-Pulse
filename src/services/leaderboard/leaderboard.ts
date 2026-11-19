import { supabase } from '@/core/supabase'
import { cachedQuery, invalidateCache, MINUTE } from '@/core/dataCache'

// One finished semester of a student, as saved by start_new_semester.
export interface PastSemester {
  semester: string
  points: number
  rank: number
}

// One leaderboard row. Fields added later by the database are optional so older saved copies still render.
export interface LeaderboardEntry {
  rank_position?: number
  name: string
  points: number
  lifetime_points?: number
  is_me?: boolean
  past?: PastSemester[]
}

// Admin summary of the current semester and the finished ones.
export interface SemesterOverview {
  semester_name: string
  scorers: number
  past: { semester: string; students: number }[]
}

const SEMESTER_KEY = 'current-semester'

// Cache key of the leaderboard; signed-in copies are per user because they mark the user's own row.
export const leaderboardCacheKey = (userId: string | null) =>
  userId ? `user:${userId}:leaderboard:v2` : 'leaderboard:v2'

// Cache key of the signed-in user's own rank.
export const myRankCacheKey = (userId: string) => `user:${userId}:my-rank`

// Cache key of the signed-in user's own past semesters.
export const myHistoryCacheKey = (userId: string) => `user:${userId}:my-semester-history`

// Top 10 of the current semester with lifetime points and past semesters.
export const fetchLeaderboardRpc = () => supabase.rpc('get_leaderboard')

// The caller's own rank (empty until the site has enough accounts).
export const fetchMyRankRpc = () => supabase.rpc('get_my_rank')

// The caller's own finished semesters, newest first.
export const fetchMyHistoryRpc = () => supabase.rpc('get_my_semester_history')

// Reads the rank number out of a get_my_rank response; null when there is none.
export function rankFrom(rows: unknown): number | null {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const value = (rows[0] as { rank_position?: unknown }).rank_position
  return typeof value === 'number' ? value : null
}

// Loads the current semester name (cached for a few minutes); empty when none is set.
export async function fetchCurrentSemester(onUpdate?: (name: string) => void): Promise<string> {
  const { data } = await cachedQuery(
    SEMESTER_KEY,
    () => supabase.from('site_settings').select('value').eq('key', 'current_semester').maybeSingle(),
    {
      ttl: 5 * MINUTE,
      onUpdate: result => { if (!result.error) onUpdate?.(result.data?.value || '') },
    }
  )
  return data?.value || ''
}

// Forgets the saved semester name so the next read fetches it again.
export function invalidateCurrentSemester() {
  invalidateCache(SEMESTER_KEY)
}

// Suggests the next semester name by raising a trailing number ("S3" becomes "S4"); empty when there is none.
export function nextSemesterName(current: string): string {
  const match = /^(.*?)(\d+)$/.exec(current.trim())
  return match ? `${match[1]}${Number(match[2]) + 1}` : ''
}

// Admin: loads the current semester, how many students have points, and the finished semesters.
export async function fetchSemesterOverview(): Promise<{ data: SemesterOverview | null; error: { message: string } | null }> {
  const { data, error } = await supabase.rpc('admin_get_semester_overview')
  if (error) return { data: null, error }
  const row = Array.isArray(data) ? data[0] : null
  if (!row) return { data: null, error: { message: 'No semester data returned' } }
  return {
    data: { semester_name: row.semester_name || '', scorers: row.scorers || 0, past: row.past || [] },
    error: null,
  }
}

// Admin: saves the standings, resets semester points and switches to the new semester; resolves to how many students were saved.
export async function startNewSemester(current: string, next: string) {
  const { data, error } = await supabase.rpc('start_new_semester', { p_current: current, p_next: next })
  return { data: data as number | null, error }
}
