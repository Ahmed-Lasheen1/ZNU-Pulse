import { useState, useEffect, type CSSProperties } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import { watchOnlineCount } from '../../lib/onlinePresence'
import { ModuleIcon } from '../../lib/medicalIcons'
import EmptyState from '../../components/pulse/EmptyState'
import ErrorBanner from '../../components/ErrorBanner'
import AdminFormCard from './AdminFormCard'
import AdminPill from './AdminPill'
import { StatCard, BarChart, ProgressRow, RankRow, Signal } from './AnalyticsWidgets'
import { miniBtn } from './adminStyles'
import { accuracyColor } from '../mcq/mcqShared'
import {
  DotIcon, PeopleIcon, BellIcon, ChartBarIcon, TargetIcon, LightningIcon, UserIcon,
  WeeklyReportIcon, CalendarDotIcon, ClockIcon, WarningIcon, FlagIcon, BookIcon, CheckCircleIcon
} from '../../components/ui/tool-icons'
import type { AdminModule } from './adminTypes'

interface UserStats {
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

interface DailyPoint {
  day: string
  active: number
  quizzes: number
  answers: number
  signups: number
}

interface Performance {
  quizzes: number
  quizzes_prev: number
  questions: number
  accuracy: number | null
  accuracy_prev: number | null
  by_type: Record<string, number>
}

interface ModuleStat {
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

interface WeakSubject {
  id: string
  name: string
  module_id: string
  attempted: number
  accuracy: number
}

interface FlaggedQuestion {
  id: string
  question: string
  module_id: string
  flags: number
}

interface AnalyticsData {
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

interface DifficultyRow {
  id: string
  question: string
  module_id: string
  incorrect_count: number
  total_attempts: number
  error_rate: number
}

interface AnalyticsTabProps {
  dark: boolean
  modules: AdminModule[]
}

const PERIODS = [7, 30, 90] as const

const CHART_METRICS = [
  { id: 'active', label: 'Active students', color: '#22c55e' },
  { id: 'quizzes', label: 'Quizzes', color: '#38bdf8' },
  { id: 'answers', label: 'Questions answered', color: '#a78bfa' },
  { id: 'signups', label: 'Sign-ups', color: '#f59e0b' },
] as const

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => String(hour))
const QUIZ_TYPE_LABELS: Record<string, string> = { practice: 'Practice', mock: 'Mock exam', retry: 'Retry' }
const SOURCE_LABELS: Record<string, string> = { ai: 'AI', courses: 'Courses', university: 'University Doctors', untagged: 'Untagged' }
const MISSING_FUNCTION_CODE = 'PGRST202'
const MISSING_FUNCTION_MESSAGE = 'Analytics is not installed yet — run supabase/admin_analytics.sql once in the Supabase SQL editor.'

const cardGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
  gap: 16,
  marginBottom: 16,
}

function indexOfMax(values: number[]) {
  return values.some(v => v > 0) ? values.indexOf(Math.max(...values)) : -1
}

function daysSince(timestamp: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 86400000))
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export default function AnalyticsTab({ dark, modules }: AnalyticsTabProps) {
  const pt = getPulseTheme(dark)
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [metric, setMetric] = useState<typeof CHART_METRICS[number]['id']>('active')
  const [onlineCount, setOnlineCount] = useState(0)
  const [difficulty, setDifficulty] = useState<DifficultyRow[]>([])
  const [difficultyLoading, setDifficultyLoading] = useState(true)
  const [difficultyError, setDifficultyError] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    supabase.rpc('admin_get_analytics', { p_days: days }).then(({ data: result, error }) => {
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
  }, [days])

  useEffect(() => {
    let ignore = false
    supabase.rpc('get_question_difficulty', { p_min_attempts: 3 }).then(({ data: rows, error }) => {
      if (ignore) return
      if (rows && !error) setDifficulty(rows)
      setDifficultyError(!!error)
      setDifficultyLoading(false)
    })
    return () => { ignore = true }
  }, [])

  useEffect(() => watchOnlineCount(setOnlineCount), [])

  const moduleName = (id: string) => modules.find(m => m.id === id)?.name ?? ''
  const emptyNote = (text: string) => <p style={{ color: pt.textMuted, fontSize: 13 }}>{text}</p>

  const users = data?.users
  const performance = data?.performance
  const recentDaily = data?.daily.slice(-7) ?? []
  const averageDaily = recentDaily.length > 0 ? recentDaily.reduce((sum, d) => sum + d.active, 0) / recentDaily.length : 0
  const stickiness = users && users.active_30d > 0 ? Math.round((averageDaily / users.active_30d) * 100) : null
  const accuracyDelta = performance && performance.accuracy != null && performance.accuracy_prev != null
    ? Math.round((performance.accuracy - performance.accuracy_prev) * 10) / 10
    : null

  function buildSignals(d: AnalyticsData) {
    const signals: { tone: 'warn' | 'ok'; text: string }[] = []

    if (d.qna.unanswered > 0) {
      const age = d.qna.oldest_unanswered ? ` — the oldest is ${plural(daysSince(d.qna.oldest_unanswered), 'day')} old` : ''
      signals.push({ tone: 'warn', text: `${plural(d.qna.unanswered, 'anonymous question')} waiting for an answer${age}` })
    }
    d.modules
      .filter(m => m.status === 'active' && (m.questions === 0 || m.lessons_without_questions > 0))
      .forEach(m => signals.push({
        tone: 'warn',
        text: `${m.name}: ${m.questions === 0 ? 'no questions yet' : `${plural(m.lessons_without_questions, 'lesson')} without questions`}`,
      }))
    if (d.users.at_risk > 0) {
      signals.push({ tone: 'warn', text: `${plural(d.users.at_risk, 'student')} studied before but not in the last 14 days` })
    }
    if (d.users.never_active > 0) {
      signals.push({ tone: 'warn', text: `${plural(d.users.never_active, 'account')} never answered a question` })
    }
    return signals.length > 0 ? signals : [{ tone: 'ok' as const, text: 'Nothing needs attention right now' }]
  }

  function renderDashboard(d: AnalyticsData) {
    const metricMeta = CHART_METRICS.find(m => m.id === metric) ?? CHART_METRICS[0]
    const dailyValues = d.daily.map(point => point[metric])
    const dailyTotal = dailyValues.reduce((sum, v) => sum + v, 0)
    const peakHour = indexOfMax(d.hourly)
    const peakDay = indexOfMax(d.weekday)
    const quizTypes = Object.entries(d.performance.by_type).sort((a, b) => b[1] - a[1])
    const quizTotal = quizTypes.reduce((sum, [, count]) => sum + count, 0)
    const sources = Object.entries(d.content.by_source).sort((a, b) => b[1] - a[1])
    const adoptionTotal = d.users.total

    return (
      <>
        <div style={{ marginBottom: 16 }}>
          <AdminFormCard
            dark={dark}
            title="Daily activity"
            Icon={ChartBarIcon}
            description={`Last ${d.days} days · ${dailyTotal} ${metricMeta.label.toLowerCase()} in total`}
            headerAction={
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CHART_METRICS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMetric(m.id)}
                    style={{ ...miniBtn(metric === m.id ? m.color : pt.sub), background: metric === m.id ? `${m.color}22` : 'transparent' }}
                  >{m.label}</button>
                ))}
              </div>
            }
          >
            <BarChart
              dark={dark}
              values={dailyValues}
              labels={d.daily.map(point => point.day.slice(5).replace('-', '/'))}
              color={metricMeta.color}
              labelEvery={d.days <= 7 ? 1 : d.days <= 30 ? 5 : 15}
              height={150}
            />
          </AdminFormCard>
        </div>

        <div style={cardGrid}>
          <AdminFormCard
            dark={dark}
            title="Needs attention"
            Icon={WarningIcon}
            description="Things worth acting on, based on student activity and your content."
          >
            {buildSignals(d).map((signal, i) => <Signal key={i} dark={dark} tone={signal.tone}>{signal.text}</Signal>)}
          </AdminFormCard>

          <AdminFormCard
            dark={dark}
            title="When students study"
            Icon={ClockIcon}
            description={peakHour >= 0
              ? `Busiest around ${String(peakHour).padStart(2, '0')}:00 on ${WEEKDAYS[peakDay]} (Cairo time) — a good moment for a notification or announcement.`
              : 'Not enough activity yet.'}
          >
            <BarChart dark={dark} values={d.hourly} labels={HOUR_LABELS} color="#38bdf8" labelEvery={3} height={80} highlightIndex={peakHour >= 0 ? peakHour : undefined} />
            <div style={{ height: 14 }} />
            <BarChart dark={dark} values={d.weekday} labels={WEEKDAYS} color="#a78bfa" height={80} highlightIndex={peakDay >= 0 ? peakDay : undefined} />
          </AdminFormCard>
        </div>

        <div style={{ marginBottom: 16 }}>
          <AdminFormCard
            dark={dark}
            title="Modules"
            Icon={BookIcon}
            description={`Content and student activity per module over the last ${d.days} days. Accuracy includes retries.`}
          >
            {d.modules.length === 0 && emptyNote('No modules yet.')}
            {d.modules.map(m => (
              <RankRow
                key={m.id}
                dark={dark}
                title={m.name}
                subtitle={
                  <>
                    <ModuleIcon value={m.icon} size={11} color={m.color} />
                    {m.questions} questions · {m.summaries} summaries · {m.files} files · {plural(m.quizzes, 'quiz')} · {plural(m.students, 'student')}
                  </>
                }
                badge={m.accuracy == null ? '—' : `${m.accuracy}%`}
                badgeColor={m.accuracy == null ? pt.textMuted : accuracyColor(m.accuracy, pt)}
              />
            ))}
          </AdminFormCard>
        </div>

        <div style={cardGrid}>
          <AdminFormCard dark={dark} title="Student journey" Icon={PeopleIcon} description="How far registered students get, as a share of all accounts.">
            <ProgressRow dark={dark} label="Signed up" value={adoptionTotal} total={adoptionTotal} color={pt.cobalt} />
            <ProgressRow dark={dark} label="Answered a question" value={adoptionTotal - d.users.never_active} total={adoptionTotal} color="#22c55e" />
            <ProgressRow dark={dark} label="Took a quiz" value={d.adoption.quiz_takers} total={adoptionTotal} color="#a78bfa" />
            <ProgressRow dark={dark} label="Notifications on" value={d.adoption.push_users} total={adoptionTotal} color={pt.amber} />
            <ProgressRow dark={dark} label="Uses the checklist" value={d.adoption.checklist_users} total={adoptionTotal} color="#38bdf8" />
            {d.adoption.checklist_total > 0 && (
              <p style={{ color: pt.textMuted, fontSize: 12 }}>
                {Math.round((d.adoption.checklist_done / d.adoption.checklist_total) * 100)}% of checklist items are done · {plural(d.adoption.paused_exams, 'exam')} paused
              </p>
            )}
          </AdminFormCard>

          <AdminFormCard dark={dark} title="Quizzes and question bank" Icon={TargetIcon} description={`Quiz types over the last ${d.days} days, and where your questions come from.`}>
            {quizTypes.length === 0 && emptyNote('No quizzes in this period.')}
            {quizTypes.map(([type, count]) => (
              <ProgressRow key={type} dark={dark} label={QUIZ_TYPE_LABELS[type] ?? type} value={count} total={quizTotal} color={pt.cobalt} />
            ))}
            <div style={{ height: 8 }} />
            {sources.map(([source, count]) => (
              <ProgressRow key={source} dark={dark} label={`Questions · ${SOURCE_LABELS[source] ?? source}`} value={count} total={d.content.questions} color={pt.indigo} />
            ))}
            <p style={{ color: pt.textMuted, fontSize: 12 }}>
              {d.content.questions} questions · {d.content.summaries} summaries · {d.content.files} files
            </p>
          </AdminFormCard>
        </div>

        <div style={cardGrid}>
          <AdminFormCard dark={dark} title="Weakest subjects" Icon={TargetIcon} description="Lowest accuracy in practice and retry quizzes (at least 10 questions answered).">
            {d.weak_subjects.length === 0 && emptyNote('Not enough practice data yet.')}
            {d.weak_subjects.map(s => (
              <RankRow
                key={s.id}
                dark={dark}
                title={s.name}
                subtitle={`${moduleName(s.module_id)} · ${plural(s.attempted, 'question')} answered`}
                badge={`${s.accuracy}%`}
                badgeColor={accuracyColor(s.accuracy, pt)}
              />
            ))}
          </AdminFormCard>

          <AdminFormCard dark={dark} title="Most flagged questions" Icon={FlagIcon} description="Questions students flagged most often — worth re-checking the wording or the answer key.">
            {d.most_flagged.length === 0 && emptyNote('No flagged questions yet.')}
            {d.most_flagged.map(q => (
              <RankRow key={q.id} dark={dark} title={q.question} subtitle={moduleName(q.module_id)} badge={`${q.flags}×`} badgeColor={pt.amber} />
            ))}
          </AdminFormCard>
        </div>
      </>
    )
  }

  return (
    <div>
      <div className="admin-tabs" style={{ marginBottom: 8 }}>
        {PERIODS.map(period => (
          <AdminPill key={period} dark={dark} active={days === period} label={`${period} days`} Icon={CalendarDotIcon} onSelect={() => setDays(period)} />
        ))}
      </div>

      {errorMessage && <div style={{ marginBottom: 16 }}><ErrorBanner message={errorMessage} /></div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatCard dark={dark} label="Online now" Icon={DotIcon} value={onlineCount} color="#22c55e" />
        <StatCard dark={dark} label="Active today" Icon={LightningIcon} value={users?.active_today ?? '—'} color="#38bdf8" loading={loading && !data} />
        <StatCard
          dark={dark} label="Active students (7d)" Icon={PeopleIcon} value={users?.active_7d ?? '—'} color={pt.cobalt}
          loading={loading && !data} delta={users ? users.active_7d - users.active_prev_7d : null}
        />
        <StatCard
          dark={dark} label="New accounts (7d)" Icon={UserIcon} value={users?.new_7d ?? '—'} color={pt.indigo}
          loading={loading && !data} delta={users ? users.new_7d - users.new_prev_7d : null}
        />
        <StatCard dark={dark} label="Total accounts" Icon={PeopleIcon} value={users?.total ?? '—'} color={pt.amber} loading={loading && !data} />
        <StatCard
          dark={dark} label={`Quizzes (${days}d)`} Icon={ChartBarIcon} value={performance?.quizzes ?? '—'} color="#a78bfa"
          loading={loading && !data} delta={performance ? performance.quizzes - performance.quizzes_prev : null}
        />
        <StatCard
          dark={dark} label="Accuracy" Icon={TargetIcon}
          value={performance?.accuracy != null ? `${performance.accuracy}%` : '—'}
          color={performance?.accuracy != null ? accuracyColor(performance.accuracy, pt) : pt.textMuted}
          loading={loading && !data} delta={accuracyDelta} deltaSuffix=" pts"
        />
        <StatCard dark={dark} label="Daily / monthly active" Icon={WeeklyReportIcon} value={stickiness != null ? `${stickiness}%` : '—'} color="#22c55e" loading={loading && !data} />
        <StatCard dark={dark} label="Push devices" Icon={BellIcon} value={data?.adoption.push_devices ?? '—'} color={pt.amber} loading={loading && !data} />
      </div>
      <p style={{ color: pt.textMuted, fontSize: 11, marginBottom: 20, textAlign: 'center' }}>
        "Online now" counts open browser tabs right now. A student counts as active on a day when they answered a question or finished a quiz.
        Arrows compare with the previous period of the same length. Times are Cairo time.
      </p>

      {loading && !data && <EmptyState dark={dark} message="Loading..." />}
      {data && renderDashboard(data)}

      <AdminFormCard
        dark={dark}
        title="Hardest questions"
        Icon={CheckCircleIcon}
        description="Highest wrong-answer rate across all students (minimum 3 attempts). Worth double-checking for a wording issue or a wrong answer key."
      >
        {difficultyError && <ErrorBanner message="Couldn't load hardest questions — check your connection." />}
        {difficultyLoading && emptyNote('Loading...')}
        {!difficultyLoading && !difficultyError && difficulty.length === 0 && emptyNote('Not enough attempts yet to report on.')}
        {difficulty.map(row => (
          <RankRow
            key={row.id}
            dark={dark}
            title={row.question}
            subtitle={`${moduleName(row.module_id)} · ${row.incorrect_count}/${row.total_attempts} wrong`}
            badge={`${row.error_rate}%`}
            badgeColor={row.error_rate >= 70 ? pt.danger : pt.amber}
          />
        ))}
      </AdminFormCard>
    </div>
  )
}
