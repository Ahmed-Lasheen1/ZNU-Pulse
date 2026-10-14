import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getPulseTheme, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import ErrorBanner from '../components/ErrorBanner'
import SummaryOverlay from '../components/SummaryOverlay'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PageShell from '../components/pulse/PageShell'
import TabRow from '../components/TabRow'
import LoadingText from '../components/pulse/LoadingText'
import EmptyState from '../components/pulse/EmptyState'
import { useModules } from '../contexts'
import { fetchModuleStages } from '../lib/moduleStages'
import { fetchSubjectsForModule } from '../lib/subjects'
import { fetchLessonStageMap, stagesOf, inStage } from '../lib/lessonStages'
import { fetchModuleSummaries } from '../lib/moduleContent'
import { useHistoryOverlay } from '../lib/useHistoryOverlay'
import { getPreviewUrl } from '../lib/embedUrl'
import { ModuleIcon, NotesIcon } from '../lib/medicalIcons'
import { ConstructionIcon } from '../components/ui/tool-icons'

interface SummaryModule {
  id: string; name: string; icon?: string | null; color: string; status: 'active' | 'completed'
}
interface Summary {
  id: string; title: string; url: string; module_id: string; subject_id?: string | null; lesson_id?: string | null; exam_stage?: string | null
}
interface SummarySubject { id: string; module_id: string; name: string }
interface ExamStage { value: string; title: string; emoji?: string; Icon?: (p: { color: string; size?: number }) => JSX.Element; color: string }

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

  const stagesWithSummaries = new Set(summaries.flatMap(s => stagesOf(s, lessonStageMap)))
  const visibleStages = stages.filter(s => stagesWithSummaries.has(s.value))

  const filtered = summaries.filter(s =>
    inStage(s, activeStage, lessonStageMap) &&
    (activeSubject === 'all' || s.subject_id === activeSubject)
  )

  if (selected) return (
    <SummaryOverlay dark={dark} onBack={() => setSelected(null)} title={selected.title} url={getPreviewUrl(selected.url)} />
  )

  return (
    <PageShell dark={dark} backFallback={`/module/${mod.id}`}>
      <style>{`
        .summaries-list-wide {
          width: 100%; max-width: 900px; margin: 0 auto;
          display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px;
        }
        .summary-card-inner {
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px; padding: 18px 22px; min-width: 0;
        }
        .summary-card-main { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1; }
        .summary-card-icon {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .summary-card-text { min-width: 0; flex: 1; }
        .summary-card-title {
          display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
          overflow: hidden; word-break: break-word; overflow-wrap: anywhere;
        }
        .summary-card-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .summary-card-open {
          border-radius: 999px; padding: 6px 14px; font-size: 12px; font-weight: 700; flex-shrink: 0; white-space: nowrap;
        }
        @media (max-width: 480px) {
          .summary-card-inner { padding: 14px; gap: 10px; }
          .summary-card-main { gap: 10px; }
          .summary-card-icon { width: 38px; height: 38px; border-radius: 10px; }
          .summary-card-open { padding: 6px 11px; }
        }
      `}</style>

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
          style={{ marginBottom: 16 }}
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

      {loading && <LoadingText />}

      {!loading && filtered.length === 0 && (
        <EmptyState dark={dark} icon={<ConstructionIcon color={pt.sub} size={14} />} message="No summaries here yet" />
      )}

      <div className="summaries-list-wide">
        {filtered.map((sum, i) => (
          <LiquidGlassCard key={sum.id} dark={dark} delay={i * 70} onClick={() => setSelected(sum)} style={{ padding: 0 }}>
            <div className="summary-card-inner">
              <div className="summary-card-main">
                <div className="summary-card-icon" style={{ background: `${mod.color}20`, border: `1px solid ${mod.color}40` }}>
                  <NotesIcon color={mod.color} size={20} />
                </div>
                <div className="summary-card-text">
                  <div className="summary-card-title" style={{ ...pulseType.cardTitle, color: pt.textPrimary, fontSize: 15 }}>{sum.title}</div>
                  <div className="summary-card-sub" style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>{mod.name}</div>
                </div>
              </div>
              <div className="summary-card-open" style={{ background: mod.color, color: '#0f172a' }}>Open →</div>
            </div>
          </LiquidGlassCard>
        ))}
      </div>
    </PageShell>
  )
}

export default function Summaries({ dark }: { dark: boolean }) {
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: SummaryModule[]; modulesLoaded: boolean; modulesError: boolean }
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const moduleParam = params.get('module')
  const initialStage = params.get('stage') || 'all'
  const initialSummaryId = params.get('summary') || undefined

  const resolvedModule: SummaryModule | null =
    (moduleParam && modules.find(m => m.id === moduleParam)) ||
    modules.find(m => m.status === 'active') ||
    modules[0] ||
    null

  return resolvedModule ? (
    <ModuleSummaries mod={resolvedModule} dark={dark} initialStage={initialStage} initialSummaryId={initialSummaryId} />
  ) : (
    <PageShell dark={dark} backFallback="/">
      <div style={{ textAlign: 'center', padding: 40, color: ON_GRADIENT_TOP.secondary }}>
        {modulesError
          ? <ErrorBanner message="Couldn't load modules — check your connection." />
          : !modulesLoaded ? 'Loading...' : 'No modules available yet.'}
      </div>
    </PageShell>
  )
}
