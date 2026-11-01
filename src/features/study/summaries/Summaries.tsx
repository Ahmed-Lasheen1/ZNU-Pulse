import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getPulseTheme, pulseType, ON_GRADIENT_TOP } from '@/shared/theme/premiumTheme'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import SummaryOverlay from '@/features/study/summaries/SummaryOverlay'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import PageShell from '@/shared/ui/layout/PageShell'
import TabRow from '@/shared/ui/controls/TabRow'
import { SummaryListSkeleton } from '@/shared/ui/feedback/Skeletons'
import EmptyState from '@/shared/ui/feedback/EmptyState'
import { useModules } from '@/core/contexts'
import { fetchModuleStages } from '@/services/content/moduleStages'
import { fetchSubjectsForModule } from '@/services/content/subjects'
import { fetchLessonStageMap, stagesOf, inStage } from '@/services/content/lessonStages'
import { fetchModuleSummaries } from '@/services/content/moduleContent'
import { useHistoryOverlay } from '@/shared/hooks/useHistoryOverlay'
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

const TAB_ROW_STYLE = {
  flexWrap: 'wrap', overflowX: 'visible', rowGap: 10, marginBottom: 16,
} as const

function ModuleSummaries({ mod, dark, initialStage, initialSummaryId }: {
  mod: SummaryModule; dark: boolean; initialStage?: string; initialSummaryId?: string
}) {
  const pt = getPulseTheme(dark)
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [selected, setSelected] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [activeStage, setActiveStage] = useState(initialStage || 'all')
  const [activeSubject, setActiveSubject] = useState('all')
  const [stages, setStages] = useState<ExamStage[]>([])
  const [subjects, setSubjects] = useState<SummarySubject[]>([])
  const [lessonStageMap, setLessonStageMap] = useState<Record<string, string[]>>({})

  useHistoryOverlay(!!selected, () => setSelected(null))

  useEffect(() => {
    let ignore = false
    fetchModuleStages(mod.id).then(result => { if (!ignore) setStages(result) })
    return () => { ignore = true }
  }, [mod.id])

  useEffect(() => {
    let ignore = false
    fetchLessonStageMap().then(({ map }) => { if (!ignore) setLessonStageMap(map) })
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false
    fetchSubjectsForModule(mod.id).then(({ subjects: list, error }) => {
      if (ignore) return
      setSubjects(list)
      if (error) setLoadError(true)
    })
    return () => { ignore = true }
  }, [mod.id])

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

  useEffect(() => {
    if (!initialSummaryId || summaries.length === 0) return
    const match = summaries.find(s => s.id === initialSummaryId)
    if (match) {
      setSelected(match)
      if (match.exam_stage) setActiveStage(match.exam_stage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSummaryId, summaries])

  if (selected) return (
    <SummaryOverlay dark={dark} onBack={() => setSelected(null)} title={selected.title} url={getPreviewUrl(selected.url)} />
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
          <ModuleIcon value={mod.icon} size={44} color={mod.color} />
        </div>
        <h1 style={{
          ...pulseType.pageTitle, fontSize: 24, color: mod.color, marginBottom: 6,
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
          style={TAB_ROW_STYLE}
        />
      )}

      {subjects.length > 0 && (
        <TabRow
          items={[{ value: 'all', label: 'All' }, ...subjects.map(sub => ({ value: sub.id, label: sub.name }))]}
          active={activeSubject}
          onSelect={setActiveSubject}
          dark={dark}
          accentColor={mod.color}
          style={{ ...TAB_ROW_STYLE, marginBottom: 20 }}
        />
      )}

      {loading && <SummaryListSkeleton />}

      {!loading && filtered.length === 0 && (
        <EmptyState dark={dark} icon={<ConstructionIcon color={pt.sub} size={14} />} message="No summaries here yet" />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((sum, i) => (
          <LiquidGlassCard
            key={sum.id} dark={dark} delay={i * 70} onClick={() => setSelected(sum)}
            style={{
              padding: 'clamp(14px, 3vw, 18px) clamp(14px, 3vw, 22px)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: `${mod.color}20`, border: `1px solid ${mod.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <NotesIcon color={mod.color} size={20} />
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

export default function Summaries({ dark }: { dark: boolean }) {
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: SummaryModule[]; modulesLoaded: boolean; modulesError: boolean }
  const params = new URLSearchParams(useLocation().search)
  const moduleParam = params.get('module')

  const resolvedModule: SummaryModule | null =
    (moduleParam && modules.find(m => m.id === moduleParam)) ||
    modules.find(m => m.status === 'active') ||
    modules[0] ||
    null

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
      <div style={{ textAlign: 'center', padding: 40, color: ON_GRADIENT_TOP.secondary }}>
        {modulesError
          ? <ErrorBanner message="Couldn't load modules — check your connection." />
          : !modulesLoaded ? 'Loading...' : 'No modules available yet.'}
      </div>
    </PageShell>
  )
}
