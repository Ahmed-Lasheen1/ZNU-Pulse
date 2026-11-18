import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { getPulseTheme, pulseType, ON_BACKGROUND } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import SummaryOverlay from '@/features/study/summaries/SummaryOverlay'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import PageShell from '@/shared/ui/layout/PageShell'
import TabRow from '@/shared/ui/controls/TabRow'
import { SummaryListSkeleton } from '@/shared/ui/feedback/Skeletons'
import EmptyState from '@/shared/ui/feedback/EmptyState'
import { useModules } from '@/core/contexts'
import { resolveModule } from '@/services/content/modules'
import { fetchModuleStages } from '@/services/content/moduleStages'
import { fetchSubjectsForModule } from '@/services/content/subjects'
import { fetchLessonStageMap, stagesOf, inStage } from '@/services/content/lessonStages'
import { fetchModuleSummaries } from '@/services/content/moduleContent'
import { useHistoryOverlay } from '@/shared/hooks/useHistoryOverlay'
import { useGoBack } from '@/shared/hooks/useGoBack'
import { getPreviewUrl } from '@/shared/utils/embedUrl'
import { ModuleIcon, NotesIcon } from '@/shared/icons/medicalIcons'
import { ConstructionIcon } from '@/shared/icons/tool-icons'

interface SummaryModule {
  id: string; name: string; icon?: string | null; color: string; status: 'active' | 'completed'
}
interface Summary {
  id: string; title: string; url: string; module_id: string; subject_id?: string | null; lesson_id?: string | null; exam_stage?: string | null
}
interface SummarySubject { id: string; module_id: string; name: string }
interface ExamStage { value: string; title: string; emoji?: string; Icon?: (p: { color: string; size?: number }) => JSX.Element; color: string }

const PAGE_MAX_WIDTH = 900

// Summaries of one module: stage and subject filters, the list, and the full-screen viewer.
function ModuleSummaries({ mod, dark, initialStage, initialSummaryId }: {
  mod: SummaryModule; dark: boolean; initialStage?: string; initialSummaryId?: string
}) {
  const pt = getPulseTheme(dark)
  // The module color as text/icon color, adjusted to stay readable in the current mode (fills keep the original).
  const modColor = adaptColor(mod.color, dark)
  const goBack = useGoBack(`/module/${mod.id}`)
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [selected, setSelected] = useState<Summary | null>(null)
  // True when the open summary came from the URL (Schedule, Search); closing it then leaves the page through history.
  const [linkedOpen, setLinkedOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [activeStage, setActiveStage] = useState(initialStage || 'all')
  const [activeSubject, setActiveSubject] = useState('all')
  const [stages, setStages] = useState<ExamStage[]>([])
  const [subjects, setSubjects] = useState<SummarySubject[]>([])
  const [lessonStageMap, setLessonStageMap] = useState<Record<string, string[]>>({})
  const openedLinkRef = useRef<string | null>(null)

  // A summary opened from the list needs a history entry for the back button; a linked one already has its route entry.
  useHistoryOverlay(!!selected && !linkedOpen, () => setSelected(null))

  // Loads the module's exam stages.
  useEffect(() => {
    let ignore = false
    fetchModuleStages(mod.id).then(result => { if (!ignore) setStages(result) })
    return () => { ignore = true }
  }, [mod.id])

  // Loads which stages each lesson belongs to.
  useEffect(() => {
    let ignore = false
    fetchLessonStageMap().then(({ map }) => { if (!ignore) setLessonStageMap(map) })
    return () => { ignore = true }
  }, [])

  // Loads the module's subjects for the subject filter.
  useEffect(() => {
    let ignore = false
    fetchSubjectsForModule(mod.id).then(({ subjects: list, error }) => {
      if (ignore) return
      setSubjects(list)
      if (error) setLoadError(true)
    })
    return () => { ignore = true }
  }, [mod.id])

  // Loads the module's summaries (saved copy first, then fresh).
  useEffect(() => {
    let ignore = false
    setLoading(true)
    fetchModuleSummaries(mod.id, ({ data, error }) => { if (!ignore && !error) setSummaries(data) })
      .then(({ data, error }) => {
        if (ignore) return
        if (data) setSummaries(data)
        if (error) setLoadError(true)
        setLoading(false)
      })
    return () => { ignore = true }
  }, [mod.id])

  // Opens the summary named in the link once, after the list has loaded.
  useEffect(() => {
    if (!initialSummaryId || summaries.length === 0 || openedLinkRef.current === initialSummaryId) return
    const match = summaries.find(s => s.id === initialSummaryId)
    if (match) {
      openedLinkRef.current = initialSummaryId
      setLinkedOpen(true)
      setSelected(match)
      if (match.exam_stage) setActiveStage(match.exam_stage)
    }
  }, [initialSummaryId, summaries])

  // Closes the viewer: a linked summary returns to the page that linked it, a list summary just closes.
  function closeSummary() {
    if (linkedOpen) goBack()
    else setSelected(null)
  }

  if (selected) return (
    <SummaryOverlay dark={dark} onBack={closeSummary} title={selected.title} url={getPreviewUrl(selected.url)} />
  )

  const stagesWithSummaries = new Set(summaries.flatMap(s => stagesOf(s, lessonStageMap)))
  const visibleStages = stages.filter(s => stagesWithSummaries.has(s.value))

  const filtered = summaries.filter(s =>
    inStage(s, activeStage, lessonStageMap) &&
    (activeSubject === 'all' || s.subject_id === activeSubject)
  )

  return (
    <PageShell dark={dark} backFallback={`/module/${mod.id}`} maxWidth={PAGE_MAX_WIDTH}>
      <div style={{ textAlign: 'center', padding: '10px 0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <ModuleIcon value={mod.icon} size={44} color={modColor} />
        </div>
        <h1 style={{
          ...pulseType.pageTitle, fontSize: 24, color: modColor, marginBottom: 6,
          wordBreak: 'break-word', overflowWrap: 'anywhere'
        }}>{mod.name}</h1>
      </div>

      {loadError && <ErrorBanner />}

      {visibleStages.length > 0 && (
        <TabRow
          items={[
            { value: 'all', label: 'All' },
            ...visibleStages.map(s => ({
              value: s.value,
              label: s.Icon ? s.title : `${s.emoji} ${s.title}`,
              Icon: s.Icon,
            })),
          ]}
          active={activeStage}
          onSelect={setActiveStage}
          dark={dark}
          accentColor={mod.color}
        />
      )}

      {subjects.length > 0 && (
        <TabRow
          items={[{ value: 'all', label: 'All' }, ...subjects.map(sub => ({ value: sub.id, label: sub.name }))]}
          active={activeSubject}
          onSelect={setActiveSubject}
          dark={dark}
          accentColor={mod.color}
          style={{ marginBottom: 20 }}
        />
      )}

      {loading && <SummaryListSkeleton />}

      {!loading && filtered.length === 0 && (
        <EmptyState dark={dark} icon={<ConstructionIcon color={pt.sub} size={14} />} message="No summaries here yet" />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((sum, i) => (
          <LiquidGlassCard
            key={sum.id} dark={dark} delay={i * 70}
            onClick={() => { setLinkedOpen(false); setSelected(sum) }}
            style={{
              padding: 'clamp(14px, 3vw, 18px) clamp(14px, 3vw, 22px)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: `${modColor}20`, border: `1px solid ${modColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <NotesIcon color={modColor} size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                ...pulseType.cardTitle, color: pt.textPrimary, fontSize: 15,
                display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
                overflow: 'hidden', wordBreak: 'break-word', overflowWrap: 'anywhere',
              }}>{sum.title}</div>
              <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.name}</div>
            </div>
            <div style={{
              background: mod.color, color: '#0f172a', borderRadius: 999,
              padding: '6px 14px', fontSize: 12, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap',
            }}>Open →</div>
          </LiquidGlassCard>
        ))}
      </div>
    </PageShell>
  )
}

// Summaries page: resolves the module from the link and shows its summaries.
export default function Summaries({ dark }: { dark: boolean }) {
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: SummaryModule[]; modulesLoaded: boolean; modulesError: boolean }
  const params = new URLSearchParams(useLocation().search)
  const resolvedModule = resolveModule(modules, params.get('module'))

  if (resolvedModule) return (
    <ModuleSummaries
      mod={resolvedModule}
      dark={dark}
      initialStage={params.get('stage') || 'all'}
      initialSummaryId={params.get('summary') || undefined}
    />
  )

  return (
    <PageShell dark={dark} backFallback="/" maxWidth={PAGE_MAX_WIDTH}>
      <div style={{ textAlign: 'center', padding: 40, color: ON_BACKGROUND.secondary }}>
        {modulesError
          ? <ErrorBanner message="Couldn't load modules — check your connection." />
          : !modulesLoaded ? 'Loading...' : 'No modules available yet.'}
      </div>
    </PageShell>
  )
}
