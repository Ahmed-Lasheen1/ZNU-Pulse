import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import { ExamIcon } from '@/shared/icons/medicalIcons'
import { daysFromToday, formatShortDate, parseLocalDate, relativeDayLabel } from '@/features/tools/schedule/scheduleDates'
import type { ScheduleRow } from '@/features/tools/schedule/types'

interface ExamScheduleCardProps {
  dark: boolean
  schedule: ScheduleRow
  accent: string
  delay: number
  onViewImage: () => void
}

// Exam card: date block, title with its dates, and a countdown; opens the image only when one is attached.
export default function ExamScheduleCard({ dark, schedule, accent, delay, onViewImage }: ExamScheduleCardProps) {
  const pt = getPulseTheme(dark)
  const dates = [...(schedule.dates || [])].sort()
  const next = dates.find(d => daysFromToday(d) >= 0) ?? null
  const finished = dates.length > 0 && !next
  const shown = next ?? (finished ? dates[dates.length - 1] : null)
  const diff = next ? daysFromToday(next) : null
  const urgent = diff !== null && diff <= 2
  const countdownColor = urgent ? pt.amber : accent

  const subtitle = [schedule.week, dates.length > 0 ? dates.map(formatShortDate).join(' · ') : null].filter(Boolean).join(' · ')

  return (
    <LiquidGlassCard
      dark={dark}
      delay={delay}
      onClick={schedule.url ? onViewImage : undefined}
      style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, opacity: finished ? 0.75 : 1 }}
    >
      <div style={{
        width: 52, height: 56, borderRadius: 14, flexShrink: 0,
        background: `${accent}1f`, border: `1px solid ${accent}55`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1,
      }}>
        {shown ? (
          <>
            <span style={{ ...pulseType.sectionLabel, fontSize: 10, letterSpacing: '0.1em', color: accent }}>
              {parseLocalDate(shown).toLocaleDateString(undefined, { month: 'short' })}
            </span>
            <span style={{ fontWeight: 800, fontSize: 21, color: pt.textPrimary }}>{parseLocalDate(shown).getDate()}</span>
          </>
        ) : (
          <ExamIcon color={accent} size={22} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div dir="auto" style={{ ...pulseType.cardTitle, color: pt.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {schedule.title}
        </div>
        {subtitle && (
          <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitle}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        {diff !== null && (
          <span style={{
            background: `${countdownColor}22`, color: countdownColor, borderRadius: 999,
            padding: '3px 11px', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap',
          }}>{relativeDayLabel(diff)}</span>
        )}
        {finished && <span style={{ ...pulseType.small, color: pt.textMuted, fontWeight: 700 }}>Finished</span>}
        {schedule.url && <span style={{ ...pulseType.small, color: pt.sub, fontWeight: 700 }}>View →</span>}
      </div>
    </LiquidGlassCard>
  )
}
