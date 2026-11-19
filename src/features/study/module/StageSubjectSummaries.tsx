import { getPulseTheme, pulseType, ON_BACKGROUND } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import { ModuleIcon } from '@/shared/icons/medicalIcons'
import { wrapText } from '@/shared/utils/textStyles'

interface StageSummary {
  id: string
  title: string
  url: string
  subject_id?: string | null
}

interface StageSubject {
  id: string
  name: string
  icon?: string | null
  color?: string | null
}

// One card of the list: a summary together with the subject it belongs to.
interface SummaryEntry<T> {
  summary: T
  name: string
  icon: string | null
  color: string
}

interface StageSubjectSummariesProps<T extends StageSummary> {
  dark: boolean
  subjects: StageSubject[]
  summaries: T[]
  onOpenSummary: (summary: T) => void
}

const DEFAULT_SUBJECT_COLOR = '#34d399'
const DEFAULT_SUBJECT_ICON = '📖'

// Pairs each summary with its subject in the module's subject order; summaries without a known subject go last under "General".
function entriesBySubject<T extends StageSummary>(subjects: StageSubject[], summaries: T[]): SummaryEntry<T>[] {
  const known = new Set(subjects.map(s => s.id))
  const entries: SummaryEntry<T>[] = subjects.flatMap(s =>
    summaries
      .filter(item => item.subject_id === s.id)
      .map(summary => ({ summary, name: s.name, icon: s.icon || null, color: s.color || DEFAULT_SUBJECT_COLOR }))
  )
  summaries
    .filter(item => !item.subject_id || !known.has(item.subject_id))
    .forEach(summary => entries.push({ summary, name: 'General', icon: null, color: DEFAULT_SUBJECT_COLOR }))
  return entries
}

// Summaries of a summaries-only exam stage: one large card per summary, titled with its subject, tap to open.
export default function StageSubjectSummaries<T extends StageSummary>({
  dark, subjects, summaries, onOpenSummary,
}: StageSubjectSummariesProps<T>) {
  const pt = getPulseTheme(dark)
  const entries = entriesBySubject(subjects, summaries)

  if (entries.length === 0) return null

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ ...pulseType.sectionLabel, color: ON_BACKGROUND.muted, marginBottom: 16 }}>Summaries</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {entries.map(({ summary, name, icon, color }) => {
          // Icon color adjusted to stay readable on the card; fills keep the original color.
          const iconColor = adaptColor(color, dark)
          return (
            <LiquidGlassCard
              key={summary.id} dark={dark} delay={0}
              onClick={() => onOpenSummary(summary)}
              style={{
                padding: 'clamp(16px, 3vw, 20px) clamp(16px, 3vw, 24px)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: `${color}20`, border: `1px solid ${color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ModuleIcon value={icon} size={24} color={iconColor} fallbackEmoji={DEFAULT_SUBJECT_ICON} />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ ...pulseType.cardTitle, fontSize: 16, color: pt.textPrimary, ...wrapText }}>{name}</div>
                <div dir="auto" style={{ ...pulseType.small, color: pt.textMuted, marginTop: 3, ...wrapText }}>{summary.title}</div>
              </div>

              <div style={{
                background: color, color: '#0f172a', borderRadius: 999,
                padding: '7px 16px', fontSize: 12, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap',
              }}>Open →</div>
            </LiquidGlassCard>
          )
        })}
      </div>
    </div>
  )
}
