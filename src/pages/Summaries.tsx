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

function SummariesHome({ modules, onSelect, dark }: {
  modules: SummaryModule[]; onSelect: (m: SummaryModule) => void; dark: boolean
}) {
  const pt = getPulseTheme(dark)
  const sorted = [
    ...modules.filter(m => m.status === 'active'),
    ...modules.filter(m => m.status !== 'active')
  ]

  return (
    <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>
      <div style={{ marginBottom: 8 }}>
        <BackButton dark={dark} fallback="/" />
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <NotesIcon color={pt.success} size={48} />
        </div>
        <h1 style={{
          ...pulseType.pageTitle, fontSize: 26,
          background: `linear-gradient(135deg, ${pt.success}, ${pt.cobalt})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 8
        }}>Smart Summaries</h1>
        <p style={{ color: ON_GRADIENT_TOP.secondary, fontSize: 14 }}>Interactive study summaries for each module</p>
      </div>

      {sorted.length === 0 && (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: pt.sub }}>No summaries available yet 🚧</p>
        </LiquidGlassCard>
      )}

      <div className="auto-grid" style={{ ['--auto-grid-cols' as any]: gridCols(sorted.length) }}>
        {sorted.map((mod, i) => (
          <LiquidGlassCard key={mod.id} dark={dark} delay={i * 80} onClick={() => onSelect(mod)}
            style={{ padding: 24, textAlign: 'center', opacity: mod.status === 'active' ? 1 : 0.75 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <ModuleIcon value={mod.icon} size={40} color={mod.color} />
            </div>
            <div style={{
              ...pulseType.cardTitle, fontWeight: 900, color: mod.color, fontSize: 18, marginBottom: 6,
              wordBreak: 'break-word', overflowWrap: 'anywhere'
            }}>{mod.name}</div>
            <div style={{
              display: 'inline-block',
              background: mod.status === 'active' ? 'rgba(74,222,128,0.14)' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
              color: mod.status === 'active' ? '#4ade80' : pt.textMuted,
              border: `1px solid ${mod.status === 'active' ? 'rgba(74,222,128,0.35)' : pt.border}`,
              borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700
            }}>
              {mod.status === 'active' ? '● Active' : '✓ Completed'}
            </div>
          </LiquidGlassCard>
        ))}
      </div>
    </div>
  )
}

function ModuleSummaries({ mod, onBack, dark, initialStage, initialSummaryId }: {
  mod: SummaryModule; onBack: () => void; dark: boolean; initialStage?: string; initialSummaryId?: string
}) {
  const pt = getPulseTheme(dark)
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [selected, setSelected] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [activeStage, setActiveStage] = useState(initialStage || 'all')
  const [stages, setStages] = useState<ExamStage[]>([])

  // Back button closes this open summary before it ever falls through
  // to the outer "which module" back handled by Summaries below.
  useHistoryOverlay(!!selected, () => setSelected(null))

  useEffect(() => { fetchModuleStages(mod.id).then(setStages) }, [mod.id])

  useEffect(() => {
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
    <SummaryOverlay dark={dark} onBack={() => setSelected(null)} title={selected.title} url={selected.url} />
  )

  return (
    <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>
      {/* "Back" here means "return to the module grid", a local
          view switch, not real page navigation — that's why this
          passes onClick instead of relying on BackButton's default
          history behavior. */}
      <div style={{ marginBottom: 8 }}>
        <BackButton dark={dark} onClick={onBack} />
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
  const { modules } = useModules() as { modules: SummaryModule[] }
  const location = useLocation()
  const [selected, setSelected] = useState<SummaryModule | null>(null)

  // Pressing back while viewing one module's summaries returns to the
  // module grid instead of leaving the Summaries page entirely.
  useHistoryOverlay(!!selected, () => setSelected(null))

  useEffect(() => {
    if (selected || modules.length === 0) return
    const params = new URLSearchParams(location.search)
    const moduleParam = params.get('module')
    if (moduleParam) {
      const found = modules.find(m => m.id === moduleParam)
      if (found) setSelected(found)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, location.search])

  const initialStage = new URLSearchParams(location.search).get('stage') || 'all'
  // AUDIT FIX (search accuracy): a specific summary id from Search.tsx
  // (`?summary=<id>`), forwarded down so ModuleSummaries can open that
  // exact summary the moment its list finishes loading.
  const initialSummaryId = new URLSearchParams(location.search).get('summary') || undefined

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      {selected
        ? <ModuleSummaries mod={selected} onBack={() => setSelected(null)} dark={dark} initialStage={initialStage} initialSummaryId={initialSummaryId} />
        : <SummariesHome modules={modules} onSelect={setSelected} dark={dark} />}
    </div>
  )
}
