import { getPulseTheme, pulseType, ON_BACKGROUND } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import { glassHoverTint } from '@/shared/theme/liquidGlass'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
import { ModuleIcon, NotesIcon } from '@/shared/icons/medicalIcons'
import { SmartSummariesIcon } from '@/shared/icons/tool-icons'
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

interface SubjectGroup<T> {
  key: string
  name: string
  icon: string | null
  color: string | null
  summaries: T[]
}

interface StageSubjectSummariesProps<T extends StageSummary> {
  dark: boolean
  subjects: StageSubject[]
  summaries: T[]
  onOpenSummary: (summary: T) => void
}

const GENERAL_KEY = 'general'

// Groups summaries by subject in the module's subject order; summaries without a known subject go last under "General".
function groupBySubject<T extends StageSummary>(subjects: StageSubject[], summaries: T[]): SubjectGroup<T>[] {
  const known = new Set(subjects.map(s => s.id))
  const groups: SubjectGroup<T>[] = subjects
    .map(s => ({
      key: s.id,
      name: s.name,
      icon: s.icon || null,
      color: s.color || null,
      summaries: summaries.filter(item => item.subject_id === s.id),
    }))
    .filter(group => group.summaries.length > 0)

  const loose = summaries.filter(item => !item.subject_id || !known.has(item.subject_id))
  if (loose.length > 0) groups.push({ key: GENERAL_KEY, name: 'General', icon: null, color: null, summaries: loose })
  return groups
}

// Summaries list of a summaries-only exam stage: one card per subject, each summary opens on tap.
export default function StageSubjectSummaries<T extends StageSummary>({
  dark, subjects, summaries, onOpenSummary,
}: StageSubjectSummariesProps<T>) {
  const pt = getPulseTheme(dark)
  const hoverTint = glassHoverTint(dark)
  const groups = groupBySubject(subjects, summaries)

  if (groups.length === 0) return null

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ ...pulseType.sectionLabel, color: ON_BACKGROUND.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SmartSummariesIcon color={ON_BACKGROUND.muted} size={14} /> Summaries
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {groups.map(group => {
          // Subject color as text/icon color, adjusted for the current mode.
          const groupColor = group.color ? adaptColor(group.color, dark) : pt.success
          return (
            <LiquidGlassCard key={group.key} dark={dark} delay={0} style={{ padding: '14px 12px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px 10px' }}>
                {group.icon
                  ? <ModuleIcon value={group.icon} size={20} color={groupColor} />
                  : <NotesIcon color={groupColor} size={20} />}
                <span style={{ ...pulseType.cardTitle, fontSize: 14, color: pt.textPrimary, minWidth: 0, ...wrapText }}>{group.name}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.summaries.map(item => (
                  <PulseGlassRow
                    key={item.id} dark={dark} radius={12} hoverTint={hoverTint}
                    onClick={() => onOpenSummary(item)}
                    role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenSummary(item) } }}
                  >
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <NotesIcon color={pt.success} size={16} />
                      <span dir="auto" style={{ flex: 1, minWidth: 0, color: pt.textPrimary, fontSize: 13, fontWeight: 600, ...wrapText }}>{item.title}</span>
                      <span style={{ flexShrink: 0, color: pt.sub, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>Open →</span>
                    </div>
                  </PulseGlassRow>
                ))}
              </div>
            </LiquidGlassCard>
          )
        })}
      </div>
    </div>
  )
}
