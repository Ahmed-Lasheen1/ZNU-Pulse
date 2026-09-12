// src/pages/StagePage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import ErrorBanner from '../components/ErrorBanner'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../components/pulse/PulseBackground'
import BackButton from '../components/pulse/BackButton'
import SummaryOverlay from '../components/SummaryOverlay'
import { useToast } from '../components/ToastProvider'
import { useModules } from '../contexts'
import { fetchModuleStages, stageMetaFrom } from '../lib/moduleStages'
import { fetchSubjectsForModule } from '../lib/subjects'
import { useHistoryOverlay } from '../lib/useHistoryOverlay'
import { getPreviewUrl } from '../lib/embedUrl'
// AUDIT FIX: isSafeExternalUrl guards the admin-entered Drive link before
// it's ever shown as a clickable card / passed to window.open() — see
// src/lib/embedUrl.js for details.
import { isSafeExternalUrl } from '../lib/embedUrl'
import { ModuleIcon, ExamIcon, NotesIcon } from '../lib/medicalIcons'
import { StudyMaterialsIcon, StudyByLessonIcon, SmartSummariesIcon, PracticeIcon, BookIcon, FolderIcon } from '@/components/ui/tool-icons'

interface PageModule { id: string; name: string; icon?: string | null; color: string }
interface PageSubject { id: string; module_id: string; name: string; icon?: string | null; color?: string | null }
interface ExamStage { value: string; title: string; emoji?: string; Icon?: (p: { color: string; size?: number }) => JSX.Element; color: string }
interface Summary { id: string; title: string; url: string }

function gridCols(n: number) { return n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : 4 }

export default function StagePage({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const { moduleId, stage } = useParams()
  const navigate = useNavigate()
  const showToast = useToast() as (message: string, type?: 'success' | 'error') => void
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: PageModule[]; modulesLoaded: boolean; modulesError: boolean }
  const module = modules.find(m => m.id === moduleId) || null
  const [stages, setStages] = useState<ExamStage[]>([])
  const meta = stageMetaFrom(stages, stage!)
  const [presentFileTypes, setPresentFileTypes] = useState<Set<string>>(new Set())
  const [summaries, setSummaries] = useState<Summary[]>([])
  // AUDIT FIX (per user request): tracks whether the summaries fetch
  // has actually resolved yet, so a click that lands before it does
  // can't be mistaken for "genuinely zero summaries" and trigger a
  // false toast.
  const [summariesLoaded, setSummariesLoaded] = useState(false)
  const [hasStageQuestions, setHasStageQuestions] = useState<boolean | null>(null)
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [subjects, setSubjects] = useState<PageSubject[]>([])

  // Hardware/browser back now closes the full-screen summary overlay
  // instead of leaving StagePage entirely — see useHistoryOverlay.
  useHistoryOverlay(!!selectedSummary, () => setSelectedSummary(null))

  useEffect(() => {
    let ignore = false
    fetchModuleStages(moduleId!).then(result => { if (!ignore) setStages(result) })
    return () => { ignore = true }
  }, [moduleId])

  useEffect(() => {
    let ignore = false
    supabase.from('site_settings').select('key, value').in('key', ['drive_url', `drive_url_${stage}`])
      .then(({ data }) => {
        if (ignore || !data) return
        const byKey = Object.fromEntries(data.map((r: any) => [r.key, r.value]))
        setDriveUrl(byKey[`drive_url_${stage}`] || byKey['drive_url'] || '')
      })
    return () => { ignore = true }
  }, [stage])

  useEffect(() => {
    let ignore = false
    setSummariesLoaded(false)

    supabase.from('files').select('type').eq('module_id', moduleId).eq('exam_stage', stage)
      .then(({ data, error }) => {
        if (ignore) return
        if (data) setPresentFileTypes(new Set(data.map((f: any) => f.type)))
        if (error) setLoadError(true)
      })
    supabase.from('summaries').select('*').eq('module_id', moduleId).eq('exam_stage', stage).order('created_at')
      .then(({ data, error }) => {
        if (ignore) return
        if (data) setSummaries(data)
        if (error) setLoadError(true)
        setSummariesLoaded(true)
      })
    supabase.from('questions').select('id', { count: 'exact', head: true }).eq('module_id', moduleId).eq('exam_stage', stage)
      .then(({ count, error }) => {
        if (ignore) return
        setHasStageQuestions((count || 0) > 0)
        if (error) setLoadError(true)
      })
    fetchSubjectsForModule(moduleId!).then(({ subjects, error }) => {
      if (ignore) return
      setSubjects(subjects)
      if (error) setLoadError(true)
    })

    return () => { ignore = true }
  }, [moduleId, stage])

  if (!module) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: 24, textAlign: 'center', color: ON_GRADIENT_TOP.secondary }}>
        {(loadError || modulesError)
          ? <ErrorBanner message="Couldn't load this module — check your connection." />
          : !modulesLoaded ? 'Loading...' : "This module doesn't exist or was removed."}
      </div>
    </div>
  )

  if (selectedSummary) return (
    <SummaryOverlay
      dark={dark}
      onBack={() => setSelectedSummary(null)}
      title={selectedSummary.title}
      url={getPreviewUrl(selectedSummary.url)}
    />
  )

  // AUDIT FIX (per user request): a toast (plain style, not the red
  // error one) replaces navigating into an empty Summaries/MCQ page
  // once we actually know there's nothing for this stage.
  function openSummaries() {
    if (summariesLoaded && summaries.length === 0) { showToast('No summaries added for this stage yet'); return }
    if (summaries.length === 1) setSelectedSummary(summaries[0])
    else navigate(`/summaries?module=${moduleId}&stage=${stage}`)
  }
  function openPractice() {
    if (hasStageQuestions === false) { showToast('No questions added for this stage yet'); return }
    navigate(`/mcq?module=${moduleId}&stage=${stage}`)
  }

  // AUDIT FIX: only render/open the Drive link when it's a real http(s)
  // URL — closes the same "unvalidated admin-entered URL used as a
  // window.open target" gap that embedUrl.js's isSafeUrl() closes for
  // iframe/audio src elsewhere in the app.
  const driveUrlIsSafe = !!driveUrl && isSafeExternalUrl(driveUrl)

  // AUDIT FIX (files-as-one-card, per user request): same consolidation
  // as ModulePage.tsx — one "Files" card instead of one card per file
  // type, sitting next to Drive. Note this still links WITHOUT a stage
  // param (`?module=...`, no `&stage=...`), matching the pre-existing
  // behavior of the old per-type cards here, which never passed stage
  // either — FilesPage has never filtered by exam stage, only by
  // module/subject/type, so this isn't a new gap, just an unchanged one.
  const materialsCards: JSX.Element[] = []
  if (presentFileTypes.size > 0) {
    materialsCards.push(
      <LiquidGlassCard key="files" dark={dark} delay={0}
        onClick={() => navigate(`/files?module=${moduleId}`)}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          background: `${pt.cobalt}20`, border: `1px solid ${pt.cobaltBorder}`,
          borderRadius: 12, width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <FolderIcon color={pt.cobalt} size={20} />
        </div>
        <div>
          <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>Files</div>
          <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>Explanations, questions, lectures & more</div>
        </div>
      </LiquidGlassCard>
    )
  }
  if (driveUrlIsSafe) {
    materialsCards.push(
      <LiquidGlassCard key="drive" dark={dark} delay={0}
        onClick={() => window.open(driveUrl, '_blank', 'noopener,noreferrer')}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          background: `${pt.cobalt}20`, border: `1px solid ${pt.cobaltBorder}`,
          borderRadius: 12, width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <StudyMaterialsIcon color={pt.cobalt} size={20} />
        </div>
        <div>
          <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>University Google Drive</div>
          <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>Lectures, recordings & more</div>
        </div>
      </LiquidGlassCard>
    )
  }

  // AUDIT FIX (per user request): pulled out so the single-subject case
  // below can reuse it inside .auto-grid-single instead of stretching
  // a lone card across the whole row.
  const renderSubjectCard = (sub: PageSubject, i: number) => (
    <LiquidGlassCard key={sub.id} dark={dark} delay={i * 80}
      onClick={() => navigate(`/module/${moduleId}/subject/${sub.id}?stage=${stage}`)}
      style={{ padding: 'clamp(20px, 2vw, 28px)', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        {sub.icon
          ? <ModuleIcon value={sub.icon} size={38} color={sub.color || '#34d399'} />
          : <BookIcon color={sub.color || '#34d399'} size={38} />}
      </div>
      <div style={{ ...pulseType.cardTitle, fontSize: 'clamp(13px, 1.1vw, 16px)', color: pt.textPrimary }}>{sub.name}</div>
    </LiquidGlassCard>
  )

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>

        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback={`/module/${moduleId}`} />
        </div>

        <div style={{ textAlign: 'center', padding: '10px 0 30px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            {meta.Icon
              ? <meta.Icon color={meta.color} size={44} />
              : <span style={{ fontSize: 44 }}>{meta.emoji}</span>}
          </div>
          <h1 style={{ ...pulseType.pageTitle, fontSize: 24, color: meta.color, marginBottom: 6 }}>{meta.title}</h1>
          <div style={{ color: ON_GRADIENT_TOP.secondary, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ModuleIcon value={module.icon} size={14} color={ON_GRADIENT_TOP.secondary} /> {module.name}
          </div>
        </div>

        {materialsCards.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <StudyMaterialsIcon color={ON_GRADIENT_TOP.muted} size={14} /> Study Materials
            </h2>
            {materialsCards.length === 1 ? (
              <div className="auto-grid-single">{materialsCards[0]}</div>
            ) : (
              <div className="summary-practice-row">
                {materialsCards}
              </div>
            )}
          </div>
        )}

        {/* AUDIT FIX (per user request): links carry the current stage
            (`?stage=<value>`) so SubjectPage can narrow its lesson list
            to only the lessons that actually have content tagged to
            THIS stage. A single subject renders centered/width-capped
            instead of stretching across the whole row. */}
        {subjects.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <StudyByLessonIcon color={ON_GRADIENT_TOP.muted} size={14} /> Study by Lesson
            </h2>
            {subjects.length === 1 ? (
              <div className="auto-grid-single">{renderSubjectCard(subjects[0], 0)}</div>
            ) : (
              <div className="auto-grid" style={{ ['--auto-grid-cols' as any]: gridCols(subjects.length) }}>
                {subjects.map(renderSubjectCard)}
              </div>
            )}
          </div>
        )}

        {/* Smart Summaries & Practice — side by side from tablet width
            up (.summary-practice-row, see index.css), stacked on
            phones like every other section on this page. Both now
            toast instead of navigating when there's genuinely nothing
            for this stage — see openSummaries/openPractice above. */}
        <div className="summary-practice-row" style={{ marginBottom: 32 }}>
          <div>
            <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SmartSummariesIcon color={ON_GRADIENT_TOP.muted} size={14} /> Smart Summaries
            </h2>
            <LiquidGlassCard dark={dark} delay={0} onClick={openSummaries} style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <NotesIcon color={pt.success} size={30} />
              </div>
              <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>Summaries</div>
              <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>
                {summaries.length === 0 ? `${meta.title} summaries` : summaries.length === 1 ? summaries[0].title : `${summaries.length} available`}
              </div>
            </LiquidGlassCard>
          </div>

          <div>
            <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PracticeIcon color={ON_GRADIENT_TOP.muted} size={14} /> Practice
            </h2>
            <LiquidGlassCard dark={dark} delay={0} onClick={openPractice} style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <ExamIcon color="#e2725b" size={30} />
              </div>
              <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>MCQ Bank</div>
              <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>Practice {meta.title} questions</div>
            </LiquidGlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}
