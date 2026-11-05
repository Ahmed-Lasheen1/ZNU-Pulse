import { useState, useEffect } from 'react'
import { supabase } from '@/core/supabase'
import { useAuth } from '@/core/contexts'
import { cachedQuery, invalidateCache, MINUTE } from '@/core/dataCache'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import { watchOnlineCount } from '@/services/presence/onlinePresence'
import { CardGridSkeleton } from '@/shared/ui/feedback/Skeletons'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import AdminPill from '@/features/admin/common/AdminPill'
import { StatCard } from '@/features/admin/analytics/AnalyticsWidgets'
import { accuracyColor } from '@/shared/utils/accuracy'
import OverviewSection from '@/features/admin/analytics/OverviewSection'
import StudentsSection from '@/features/admin/analytics/StudentsSection'
import LearningSection from '@/features/admin/analytics/LearningSection'
import ContentSection from '@/features/admin/analytics/ContentSection'
import {
  MISSING_FUNCTION_CODE, MISSING_FUNCTION_MESSAGE, statRow,
  type AnalyticsData, type DifficultyState
} from '@/features/admin/analytics/analyticsShared'
import { DotIcon, PeopleIcon, ChartBarIcon, TargetIcon, LightningIcon, UserIcon, CalendarDotIcon, BookIcon, RefreshIcon } from '@/shared/icons/tool-icons'
import type { AdminModule } from '@/features/admin/common/adminTypes'

interface AnalyticsTabProps {
  dark: boolean
  modules: AdminModule[]
}

const PERIODS = [7, 30, 90] as const

// How long a saved analytics copy is reused before it is refreshed in the background.
const ANALYTICS_TTL = 5 * MINUTE
const DIFFICULTY_TTL = 10 * MINUTE

const SECTIONS = [
  { id: 'overview', label: 'Overview', Icon: ChartBarIcon },
  { id: 'students', label: 'Students', Icon: PeopleIcon },
  { id: 'learning', label: 'Learning', Icon: TargetIcon },
  { id: 'content', label: 'Content', Icon: BookIcon },
] as const

type SectionId = typeof SECTIONS[number]['id']

// Cache keys start with "user:" so sign-out clears them with the other per-user caches.
const analyticsKey = (userId: string, days: number) => `user:${userId}:admin-analytics:${days}`
const difficultyKey = (userId: string) => `user:${userId}:admin-difficulty`

// Admin analytics: stat cards plus Overview/Students/Learning/Content sections, cached between visits.
export default function AnalyticsTab({ dark, modules }: AnalyticsTabProps) {
  const pt = getPulseTheme(dark)
  const { user } = useAuth() as { user: { id: string } | null }
  const userId = user?.id ?? null
  const [days, setDays] = useState<number>(30)
  const [section, setSection] = useState<SectionId>('overview')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [onlineCount, setOnlineCount] = useState(0)
  const [difficulty, setDifficulty] = useState<DifficultyState>({ rows: [], loading: true, error: false })
  const [reloadTick, setReloadTick] = useState(0)

  // Loads the summary for the selected period from the saved copy, refreshing it when it is older than the cache lifetime.
  useEffect(() => {
    if (!userId) return
    let ignore = false
    setLoading(true)
    cachedQuery(analyticsKey(userId, days), () => supabase.rpc('admin_get_analytics', { p_days: days }), {
      ttl: ANALYTICS_TTL,
      onUpdate: ({ data: fresh, error }: any) => {
        if (!ignore && !error && fresh) setData(fresh as AnalyticsData)
      },
    }).then(({ data: result, error }: any) => {
      if (ignore) return
      if (error) {
        setErrorMessage(error.code === MISSING_FUNCTION_CODE ? MISSING_FUNCTION_MESSAGE : "Couldn't load analytics — check your connection.")
      } else {
        setErrorMessage('')
        setData(result as AnalyticsData)
      }
      setLoading(false)
    })
    return () => { ignore = true }
  }, [days, userId, reloadTick])

  const learningOpened = section === 'learning'

  // Loads the hardest-questions list only once the Learning section is opened.
  useEffect(() => {
    if (!userId || !learningOpened) return
    let ignore = false
    cachedQuery(difficultyKey(userId), () => supabase.rpc('get_question_difficulty', { p_min_attempts: 3 }), {
      ttl: DIFFICULTY_TTL,
      onUpdate: ({ data: fresh, error }: any) => {
        if (!ignore && !error && fresh) setDifficulty({ rows: fresh, loading: false, error: false })
      },
    }).then(({ data: rows, error }: any) => {
      if (ignore) return
      setDifficulty({ rows: rows && !error ? rows : [], loading: false, error: !!error })
    })
    return () => { ignore = true }
  }, [userId, learningOpened, reloadTick])

  // Keeps the live "online now" counter in sync with the presence channel.
  useEffect(() => watchOnlineCount(setOnlineCount), [])

  // Drops every saved analytics copy and loads fresh numbers.
  function refreshAnalytics() {
    if (!userId) return
    PERIODS.forEach(period => invalidateCache(analyticsKey(userId, period)))
    invalidateCache(difficultyKey(userId))
    setDifficulty({ rows: [], loading: true, error: false })
    setReloadTick(t => t + 1)
  }

  const users = data?.users
  const performance = data?.performance
  const pending = loading && !data
  const accuracyDelta = performance && performance.accuracy != null && performance.accuracy_prev != null
    ? Math.round((performance.accuracy - performance.accuracy_prev) * 10) / 10
    : null

  return (
    <div>
      <div className="admin-tabs" style={{ marginBottom: 8 }}>
        {PERIODS.map(period => (
          <AdminPill key={period} dark={dark} active={days === period} label={`${period} days`} Icon={CalendarDotIcon} onSelect={() => setDays(period)} />
        ))}
        <AdminPill dark={dark} active={false} label="Refresh" Icon={RefreshIcon} onSelect={refreshAnalytics} />
      </div>

      {errorMessage && <div style={{ marginBottom: 16 }}><ErrorBanner message={errorMessage} /></div>}

      <div style={statRow}>
        <StatCard dark={dark} label="Online now" Icon={DotIcon} value={onlineCount} color="#22c55e" />
        <StatCard dark={dark} label="Active today" Icon={LightningIcon} value={users?.active_today ?? '—'} color="#38bdf8" loading={pending} />
        <StatCard
          dark={dark} label="Active students (7d)" Icon={PeopleIcon} value={users?.active_7d ?? '—'} color={pt.cobalt}
          loading={pending} delta={users ? users.active_7d - users.active_prev_7d : null}
        />
        <StatCard
          dark={dark} label="New accounts (7d)" Icon={UserIcon} value={users?.new_7d ?? '—'} color={pt.indigo}
          loading={pending} delta={users ? users.new_7d - users.new_prev_7d : null}
        />
        <StatCard
          dark={dark} label={`Quizzes (${days}d)`} Icon={ChartBarIcon} value={performance?.quizzes ?? '—'} color="#a78bfa"
          loading={pending} delta={performance ? performance.quizzes - performance.quizzes_prev : null}
        />
        <StatCard
          dark={dark} label="Accuracy" Icon={TargetIcon}
          value={performance?.accuracy != null ? `${performance.accuracy}%` : '—'}
          color={performance?.accuracy != null ? accuracyColor(performance.accuracy, pt) : pt.textMuted}
          loading={pending} delta={accuracyDelta} deltaSuffix=" pts"
        />
      </div>

      <div className="admin-tabs" style={{ marginBottom: 16 }}>
        {SECTIONS.map(s => (
          <AdminPill key={s.id} dark={dark} active={section === s.id} label={s.label} Icon={s.Icon} onSelect={() => setSection(s.id)} />
        ))}
      </div>

      {pending && <CardGridSkeleton />}

      {data && section === 'overview' && <OverviewSection dark={dark} data={data} />}
      {data && section === 'students' && <StudentsSection dark={dark} data={data} />}
      {data && section === 'learning' && <LearningSection dark={dark} data={data} modules={modules} difficulty={difficulty} />}
      {data && section === 'content' && <ContentSection dark={dark} data={data} />}

      <p style={{ color: pt.textMuted, fontSize: 11, marginTop: 8, textAlign: 'center' }}>
        "Online now" counts open browser tabs right now. A student counts as active on a day when they answered a question or finished a quiz.
        Arrows compare with the previous period of the same length. Times are Cairo time.
        Numbers are saved for a few minutes — use Refresh for the latest.
      </p>
    </div>
  )
}
