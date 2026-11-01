import { getPulseTheme } from '@/shared/theme/premiumTheme'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import AdminFormCard from '@/features/admin/common/AdminFormCard'
import { ProgressRow, RankRow } from '@/features/admin/analytics/AnalyticsWidgets'
import { plural } from '@/shared/utils/format'
import { accuracyColor } from '@/shared/utils/accuracy'
import { TargetIcon, FlagIcon, CheckCircleIcon } from '@/shared/icons/tool-icons'
import type { AdminModule } from '@/features/admin/common/adminTypes'
import { cardGrid, moduleNameOf, EmptyNote, type AnalyticsSectionProps, type DifficultyState } from '@/features/admin/analytics/analyticsShared'

interface LearningSectionProps extends AnalyticsSectionProps {
  modules: AdminModule[]
  difficulty: DifficultyState
}

const QUIZ_TYPE_LABELS: Record<string, string> = { practice: 'Practice', mock: 'Mock exam', simulator: 'Simulator', retry: 'Retry' }

export default function LearningSection({ dark, data, modules, difficulty }: LearningSectionProps) {
  const pt = getPulseTheme(dark)
  const quizTypes = Object.entries(data.performance.by_type).sort((a, b) => b[1] - a[1])
  const quizTotal = quizTypes.reduce((sum, [, count]) => sum + count, 0)

  return (
    <>
      <div style={cardGrid}>
        <AdminFormCard dark={dark} title="Quiz types" Icon={TargetIcon} description={`Quizzes taken over the last ${data.days} days.`}>
          {quizTypes.length === 0 && <EmptyNote dark={dark}>No quizzes in this period.</EmptyNote>}
          {quizTypes.map(([type, count]) => (
            <ProgressRow key={type} dark={dark} label={QUIZ_TYPE_LABELS[type] ?? type} value={count} total={quizTotal} color={pt.cobalt} />
          ))}
        </AdminFormCard>

        <AdminFormCard dark={dark} title="Weakest subjects" Icon={TargetIcon} description="Lowest accuracy in practice and retry quizzes (at least 10 questions answered).">
          {data.weak_subjects.length === 0 && <EmptyNote dark={dark}>Not enough practice data yet.</EmptyNote>}
          {data.weak_subjects.map(s => (
            <RankRow
              key={s.id}
              dark={dark}
              title={s.name}
              subtitle={`${moduleNameOf(modules, s.module_id)} · ${plural(s.attempted, 'question')} answered`}
              badge={`${s.accuracy}%`}
              badgeColor={accuracyColor(s.accuracy, pt)}
            />
          ))}
        </AdminFormCard>
      </div>

      <div style={cardGrid}>
        <AdminFormCard
          dark={dark}
          title="Hardest questions"
          Icon={CheckCircleIcon}
          description="Highest wrong-answer rate across all students (minimum 3 attempts). Worth double-checking for a wording issue or a wrong answer key."
        >
          {difficulty.error && <ErrorBanner message="Couldn't load hardest questions — check your connection." />}
          {difficulty.loading && <EmptyNote dark={dark}>Loading...</EmptyNote>}
          {!difficulty.loading && !difficulty.error && difficulty.rows.length === 0 && (
            <EmptyNote dark={dark}>Not enough attempts yet to report on.</EmptyNote>
          )}
          {difficulty.rows.map(row => (
            <RankRow
              key={row.id}
              dark={dark}
              title={row.question}
              subtitle={`${moduleNameOf(modules, row.module_id)} · ${row.incorrect_count}/${row.total_attempts} wrong`}
              badge={`${row.error_rate}%`}
              badgeColor={row.error_rate >= 70 ? pt.danger : pt.amber}
            />
          ))}
        </AdminFormCard>

        <AdminFormCard dark={dark} title="Most flagged questions" Icon={FlagIcon} description="Questions students flagged most often — worth re-checking the wording or the answer key.">
          {data.most_flagged.length === 0 && <EmptyNote dark={dark}>No flagged questions yet.</EmptyNote>}
          {data.most_flagged.map(q => (
            <RankRow key={q.id} dark={dark} title={q.question} subtitle={moduleNameOf(modules, q.module_id)} badge={`${q.flags}×`} badgeColor={pt.amber} />
          ))}
        </AdminFormCard>
      </div>
    </>
  )
}
