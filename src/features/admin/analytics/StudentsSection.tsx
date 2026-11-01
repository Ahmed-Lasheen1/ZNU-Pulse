import { getPulseTheme } from '@/shared/theme/premiumTheme'
import AdminFormCard from '@/features/admin/common/AdminFormCard'
import { BarChart, ProgressRow, StatCard } from '@/features/admin/analytics/AnalyticsWidgets'
import { plural } from '@/shared/utils/format'
import { PeopleIcon, BellIcon, ClockIcon, WeeklyReportIcon } from '@/shared/icons/tool-icons'
import { cardGrid, statRow, indexOfMax, WEEKDAYS, type AnalyticsSectionProps } from '@/features/admin/analytics/analyticsShared'

const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => String(hour))

export default function StudentsSection({ dark, data }: AnalyticsSectionProps) {
  const pt = getPulseTheme(dark)
  const { users, adoption, hourly, weekday, daily } = data
  const recentDaily = daily.slice(-7)
  const averageDaily = recentDaily.length > 0 ? recentDaily.reduce((sum, d) => sum + d.active, 0) / recentDaily.length : 0
  const stickiness = users.active_30d > 0 ? Math.round((averageDaily / users.active_30d) * 100) : null
  const peakHour = indexOfMax(hourly)
  const peakDay = indexOfMax(weekday)

  return (
    <>
      <div style={statRow}>
        <StatCard dark={dark} label="Total accounts" Icon={PeopleIcon} value={users.total} color={pt.amber} />
        <StatCard dark={dark} label="Daily / monthly active" Icon={WeeklyReportIcon} value={stickiness != null ? `${stickiness}%` : '—'} color="#22c55e" />
        <StatCard dark={dark} label="Push devices" Icon={BellIcon} value={adoption.push_devices} color={pt.amber} />
      </div>

      <div style={cardGrid}>
        <AdminFormCard dark={dark} title="Student journey" Icon={PeopleIcon} description="How far registered students get, as a share of all accounts.">
          <ProgressRow dark={dark} label="Signed up" value={users.total} total={users.total} color={pt.cobalt} />
          <ProgressRow dark={dark} label="Answered a question" value={users.total - users.never_active} total={users.total} color="#22c55e" />
          <ProgressRow dark={dark} label="Took a quiz" value={adoption.quiz_takers} total={users.total} color="#a78bfa" />
          <ProgressRow dark={dark} label="Notifications on" value={adoption.push_users} total={users.total} color={pt.amber} />
          <ProgressRow dark={dark} label="Uses the checklist" value={adoption.checklist_users} total={users.total} color="#38bdf8" />
          {adoption.checklist_total > 0 && (
            <p style={{ color: pt.textMuted, fontSize: 12 }}>
              {Math.round((adoption.checklist_done / adoption.checklist_total) * 100)}% of checklist items are done · {plural(adoption.paused_exams, 'exam')} paused
            </p>
          )}
        </AdminFormCard>

        <AdminFormCard
          dark={dark}
          title="When students study"
          Icon={ClockIcon}
          description={peakHour >= 0
            ? `Busiest around ${String(peakHour).padStart(2, '0')}:00 on ${WEEKDAYS[peakDay]} (Cairo time) — a good moment for a notification or announcement.`
            : 'Not enough activity yet.'}
        >
          <BarChart dark={dark} values={hourly} labels={HOUR_LABELS} color="#38bdf8" labelEvery={3} height={80} highlightIndex={peakHour >= 0 ? peakHour : undefined} />
          <div style={{ height: 14 }} />
          <BarChart dark={dark} values={weekday} labels={WEEKDAYS} color="#a78bfa" height={80} highlightIndex={peakDay >= 0 ? peakDay : undefined} />
        </AdminFormCard>
      </div>
    </>
  )
}
