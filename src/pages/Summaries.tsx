// src/pages/Summaries.tsx
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import ErrorBanner from '../components/ErrorBanner'
import SummaryOverlay from '../components/SummaryOverlay'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../components/pulse/PulseBackground'
import TabRow from '../components/TabRow'
import BackButton from '../components/pulse/BackButton'
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

function gridCols(n: number) { return n === 1 ? 1 : 2 }

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

  // AUDIT FIX (search accuracy): when arriving here from a Search
  // result for a specific summary (see Search.tsx's `summary` query
  // param), open that exact summary directly instead of leaving the
  // person to find it again in the list. Also switches the stage tab
  // to whichever stage that summary actually belongs to, so it's
  // visible in the filtered list underneath if the overlay is closed.
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
    <div className="pulse-wide summaries-list-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>
      {/* Scoped narrower column just for this list — .pulse-wide alone
          caps out at 1800px (shared by nearly every page), which made
          each summary row's hover scale-up (see LiquidGlassCard) stretch
          across a very wide row on large screens. .summaries-list-wide
          (defined below) caps this specific page at 900px instead,
          same pattern as Review.tsx's own .review-wide. */}
      <style>{`
        .summaries-list-wide { max-width: 900px; margin: 0 auto; }
      `}</style>

      {/* No more "back to module grid" — Summaries no longer has a
          module-picker page, so Back now does a real navigation
          (e.g. back to the module page that linked here, or Home). */}
      <div style={{ marginBottom: 8 }}>
        <BackButton dark={dark} fallback={`/module/${mod.id}`} />
      </div>

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

      <div style={{ display: 'grid', gap: 12 }}>
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
    </div>
  )
}

export default function Summaries({ dark }: { dark: boolean }) {
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: SummaryModule[]; modulesLoaded: boolean; modulesError: boolean }
  const location = useLocation()
  const pt = getPulseTheme(dark)

  const params = new URLSearchParams(location.search)
  const moduleParam = params.get('module')
  const initialStage = params.get('stage') || 'all'
  // AUDIT FIX (search accuracy): a specific summary id from Search.tsx
  // (`?summary=<id>`), forwarded down so ModuleSummaries can open that
  // exact summary the moment its list finishes loading.
  const initialSummaryId = params.get('summary') || undefined

  // The module-picker grid page is gone. `/summaries` now always goes
  // straight into one module's summaries: whichever module was passed
  // in via `?module=`, or — if none was passed (e.g. a stale bookmark,
  // or someone typing the URL directly) — the first active module,
  // falling back to the first module of any status if there are no
  // active ones.
  const resolvedModule: SummaryModule | null =
    (moduleParam && modules.find(m => m.id === moduleParam)) ||
    modules.find(m => m.status === 'active') ||
    modules[0] ||
    null

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      {resolvedModule ? (
        <ModuleSummaries mod={resolvedModule} dark={dark} initialStage={initialStage} initialSummaryId={initialSummaryId} />
      ) : (
        <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>
          <div style={{ marginBottom: 8 }}>
            <BackButton dark={dark} fallback="/" />
          </div>
          <div style={{ textAlign: 'center', padding: 40, color: ON_GRADIENT_TOP.secondary }}>
            {modulesError
              ? <ErrorBanner message="Couldn't load modules — check your connection." />
              : !modulesLoaded ? 'Loading...' : 'No modules available yet.'}
          </div>
        </div>
      )}
    </div>
  )
}
