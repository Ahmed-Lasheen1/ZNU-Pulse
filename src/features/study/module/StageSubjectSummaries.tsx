import { getPulseTheme, pulseType, ON_BACKGROUND } from '@/shared/theme/premiumTheme'
import { glassHoverTint } from '@/shared/theme/liquidGlass'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
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
}

interface SubjectGroup<T> {
  key: string
  name: string
  icon: string | null
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
      summaries: summaries.filter(item => item.subject_id === s.id),
    }))
    .filter(group => group.summaries.length > 0)

  const loose = summaries.filter(item => !item.subject_id || !known.has(item.subject_id))
  if (loose.length > 0) groups.push({ key: GENERAL_KEY, name: 'General', icon: null, summaries: loose })
  return groups
}

// Summaries of a summaries-only exam stage: a flat list with one labelled section per subject, each row opens a summary.
export default function StageSubjectSummaries<T extends StageSummary>({
  dark, subjects, summaries, onOpenSummary,
}: StageSubjectSummariesProps<T>) {
  const pt = getPulseTheme(dark)
  const hoverTint = glassHoverTint(dark)
  const groups = groupBySubject(subjects, summaries)

  if (groups.length === 0) return null

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ ...pulseType.sectionLabel, color: ON_BACKGROUND.muted, marginBottom: 16 }}>Summaries</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups.map(group => (
          <div key={group.key}>
            {/* Subject label sits directly on the page background, so it uses the page text colors. */}
            <div style={{
              ...pulseType.sectionLabel, fontSize: 11, margin: '0 4px 8px',
              color: ON_BACKGROUND.secondary, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {group.icon && <ModuleIcon value={group.icon} size={14} color={ON_BACKGROUND.secondary} />}
              <span style={{ minWidth: 0, ...wrapText }}>{group.name}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {group.summaries.map(item => (
                <PulseGlassRow
                  key={item.id} dark={dark} radius={12} hoverTint={hoverTint}
                  onClick={() => onOpenSummary(item)}
                  role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenSummary(item) } }}
                >
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span dir="auto" style={{ flex: 1, minWidth: 0, color: pt.textPrimary, fontSize: 13.5, fontWeight: 600, ...wrapText }}>{item.title}</span>
                    <span style={{ flexShrink: 0, color: pt.sub, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>Open →</span>
                  </div>
                </PulseGlassRow>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
