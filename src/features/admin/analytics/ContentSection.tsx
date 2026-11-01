import { getPulseTheme } from '@/shared/theme/premiumTheme'
import { ModuleIcon } from '@/shared/icons/medicalIcons'
import AdminFormCard from '@/features/admin/common/AdminFormCard'
import { ProgressRow, RankRow } from '@/features/admin/analytics/AnalyticsWidgets'
import { plural } from '@/shared/utils/format'
import { accuracyColor } from '@/shared/utils/accuracy'
import { BookIcon, ListIcon } from '@/shared/icons/tool-icons'
import { cardGrid, EmptyNote, type AnalyticsSectionProps } from '@/features/admin/analytics/analyticsShared'

const SOURCE_LABELS: Record<string, string> = { ai: 'AI', courses: 'Courses', university: 'University Doctors', untagged: 'Untagged' }

export default function ContentSection({ dark, data }: AnalyticsSectionProps) {
  const pt = getPulseTheme(dark)
  const sources = Object.entries(data.content.by_source).sort((a, b) => b[1] - a[1])

  return (
    <div style={cardGrid}>
      <AdminFormCard
        dark={dark}
        title="Modules"
        Icon={BookIcon}
        description={`Content and student activity per module over the last ${data.days} days. Accuracy includes retries.`}
      >
        {data.modules.length === 0 && <EmptyNote dark={dark}>No modules yet.</EmptyNote>}
        {data.modules.map(m => (
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

      <AdminFormCard dark={dark} title="Question bank" Icon={ListIcon} description="Where your questions come from.">
        {sources.map(([source, count]) => (
          <ProgressRow key={source} dark={dark} label={SOURCE_LABELS[source] ?? source} value={count} total={data.content.questions} color={pt.indigo} />
        ))}
        <p style={{ color: pt.textMuted, fontSize: 12 }}>
          {data.content.questions} questions · {data.content.summaries} summaries · {data.content.files} files
        </p>
      </AdminFormCard>
    </div>
  )
}
