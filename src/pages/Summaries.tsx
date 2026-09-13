// src/pages/Summaries.tsx
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import ErrorBanner from '../components/ErrorBanner'
import SummaryOverlay from '../components/SummaryOverlay'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PageShell from '../components/pulse/PageShell'
import TabRow from '../components/TabRow'
import { useModules } from '../contexts'
import { fetchModuleStages } from '../lib/moduleStages'
import { useHistoryOverlay } from '../lib/useHistoryOverlay'
import { getPreviewUrl } from '../lib/embedUrl'
import { ModuleIcon, NotesIcon } from '../lib/medicalIcons'
import { ConstructionIcon } from '../components/ui/tool-icons'

interface SummaryModule {
  id: string; name: string; icon?: string | null; color: string; status: 'active' | 'completed'
}
interface Summary {
  id: string; title: string; url: string; module_id: string; exam_stage?: string | null
}
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
  const [stages, setStages] = useState<ExamStage[]>([])

  // Back button closes this open summary before falling through to a
  // real page navigation.
  useHistoryOverlay(!!selected, () => setSelected(null))

  useEffect(() => { fetchModuleStages(mod.id).then(setStages) }, [mod.id])

  useEffect(() => {
    setLoading(true)
    supabase.from('summaries').select('*').eq('module_id', mod.id).order('created_at')
      .then(({ data, error }) => {
        if (data) setSummaries(data)
        if (error) setLoadError(true)
        setLoading(false)
      })
  }, [mod.id])

  // Arriving from a Search result for a specific summary opens it
  // directly and switches to its stage tab.
  useEffect(() => {
    if (!initialSummaryId || summaries.length === 0) return
    const match = summaries.find(s => s.id === initialSummaryId)
    if (match) {
      setSelected(match)
      if (match.exam_stage) setActiveStage(match.exam_stage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSummaryId, summaries])

  const filtered = summaries.filter(s => activeStage === 'all' || (s.exam_stage || 'general') === activeStage)

  if (selected) return (
    <SummaryOverlay dark={dark} onBack={() => setSelected(null)} title={selected.title} url={getPreviewUrl(selected.url)} />
  )

  return (
    <PageShell dark={dark} backFallback={`/module/${mod.id}`}>
      {/* Caps just the list at 900px — back button/title/TabRow stay full-width */}
      <style>{`
        .summaries-list-wide { max-width: 900px; margin: 0 auto; }
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

      <TabRow
        items={[
          { value: 'all', label: 'All' },
          ...stages.map(s => ({
            value: s.value,
            label: s.Icon ? s.title : `${s.emoji} ${s.title}`,
            Icon: s.Icon,
          })),
        ]}
        active={activeStage}
        onSelect={setActiveStage}
        dark={dark}
        accentColor={mod.color}
        style={{ marginBottom: 20 }}
      />

      {loading && <p style={{ color: ON_GRADIENT_TOP.secondary, textAlign: 'center' }}>Loading...</p>}

      {!loading && filtered.length === 0 && (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ConstructionIcon color={pt.sub} size={14} /> No summaries here yet
          </p>
        </LiquidGlassCard>
      )}

      <div className="summaries-list-wide" style={{ display: 'grid', gap: 12 }}>
        {filtered.map((sum, i) => (
          <LiquidGlassCard key={sum.id} dark={dark} delay={i * 70} onClick={() => setSelected(sum)}
            style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <div style={{
                background: `${mod.color}20`, border: `1px solid ${mod.color}40`,
                borderRadius: 12, width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <NotesIcon color={mod.color} size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  ...pulseType.cardTitle, color: pt.textPrimary, fontSize: 15,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>{sum.title}</div>
                <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>{mod.name}</div>
              </div>
            </div>
            <div style={{
              background: mod.color, color: '#0f172a',
              borderRadius: 999, padding: '6px 14px',
              fontSize: 12, fontWeight: 700, flexShrink: 0
            }}>Open →</div>
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
  // Specific summary id from Search.tsx (`?summary=<id>`), forwarded so
  // ModuleSummaries can open that exact summary once its list loads.
  const initialSummaryId = params.get('summary') || undefined

  // No module-picker grid page — goes straight into one module's
  // summaries: whichever was passed via `?module=`, else the first
  // active module, else the first module of any status.
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
