import { useState } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import AdminFormCard from '@/features/admin/common/AdminFormCard'
import { BarChart, Signal } from '@/features/admin/analytics/AnalyticsWidgets'
import { miniBtn } from '@/features/admin/common/adminStyles'
import { plural } from '@/shared/utils/format'
import { ChartBarIcon, WarningIcon } from '@/shared/icons/tool-icons'
import { daysSince, type AnalyticsData, type AnalyticsSectionProps } from '@/features/admin/analytics/analyticsShared'

const CHART_METRICS = [
  { id: 'active', label: 'Active students', color: '#22c55e' },
  { id: 'quizzes', label: 'Quizzes', color: '#38bdf8' },
  { id: 'answers', label: 'Questions answered', color: '#a78bfa' },
  { id: 'signups', label: 'Sign-ups', color: '#f59e0b' },
] as const

type ChartMetric = typeof CHART_METRICS[number]['id']

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

export default function OverviewSection({ dark, data }: AnalyticsSectionProps) {
  const pt = getPulseTheme(dark)
  const [metric, setMetric] = useState<ChartMetric>('active')
  const metricMeta = CHART_METRICS.find(m => m.id === metric) ?? CHART_METRICS[0]
  const values = data.daily.map(point => point[metric])
  const total = values.reduce((sum, v) => sum + v, 0)

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <AdminFormCard
          dark={dark}
          title="Needs attention"
          Icon={WarningIcon}
          description="Things worth acting on, based on student activity and your content."
        >
          {buildSignals(data).map((signal, i) => <Signal key={i} dark={dark} tone={signal.tone}>{signal.text}</Signal>)}
        </AdminFormCard>
      </div>

      <AdminFormCard
        dark={dark}
        title="Daily activity"
        Icon={ChartBarIcon}
        description={`Last ${data.days} days · ${total} ${metricMeta.label.toLowerCase()} in total`}
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
          values={values}
          labels={data.daily.map(point => point.day.slice(5).replace('-', '/'))}
          color={metricMeta.color}
          labelEvery={data.days <= 7 ? 1 : data.days <= 30 ? 5 : 15}
          height={150}
        />
      </AdminFormCard>
    </>
  )
}
