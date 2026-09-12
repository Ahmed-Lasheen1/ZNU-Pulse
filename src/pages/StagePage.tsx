import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseFonts, pulseType } from '../premiumTheme'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../components/pulse/PulseBackground'
import BackButton from '../components/pulse/BackButton'
import ModuleNotFoundState from '../components/pulse/ModuleNotFoundState'
import EntityPageHeader from '../components/pulse/EntityPageHeader'
import StudyMaterialsSection from '../components/pulse/StudyMaterialsSection'
import StudyByLessonSection from '../components/pulse/StudyByLessonSection'
import SummaryOverlay from '../components/SummaryOverlay'
import { useToast } from '../components/ToastProvider'
import { useModules } from '../contexts'
import { fetchModuleStages, stageMetaFrom } from '../lib/moduleStages'
import { fetchSubjectsForModule } from '../lib/subjects'
import { useHistoryOverlay } from '../lib/useHistoryOverlay'
import { getPreviewUrl } from '../lib/embedUrl'
import { ExamIcon, NotesIcon } from '../lib/medicalIcons'
import { SmartSummariesIcon, PracticeIcon } from '@/components/ui/tool-icons'

interface PageModule { id: string; name: string; icon?: string | null; color: string }
interface ExamStage { value: string; title: string; emoji?: string; Icon?: (p: { color: string; size?: number }) => JSX.Element; color: string }
interface Summary { id: string; title: string; url: string }

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
  // Guards against a click landing before the summaries fetch resolves.
  const [summariesLoaded, setSummariesLoaded] = useState(false)
  const [hasStageQuestions, setHasStageQuestions] = useState<boolean | null>(null)
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [subjects, setSubjects] = useState<{ id: string; module_id: string; name: string; icon?: string | null; color?: string | null }[]>([])

  // Hardware/browser back closes the summary overlay instead of leaving the page.
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
    supabase.from('questions_public').select('id', { count: 'exact', head: true }).eq('module_id', moduleId).eq('exam_stage', stage)
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
    <ModuleNotFoundState
      hasError={loadError || modulesError}
      loaded={modulesLoaded}
      errorMessage="Couldn't load this module — check your connection."
    />
  )

  if (selectedSummary) return (
    <SummaryOverlay
      dark={dark}
      onBack={() => setSelectedSummary(null)}
      title={selectedSummary.title}
      url={getPreviewUrl(selectedSummary.url)}
    />
  )

  function openSummaries() {
    if (summariesLoaded && summaries.length === 0) { showToast('No summaries added for this stage yet'); return }
    if (summaries.length === 1) setSelectedSummary(summaries[0])
    else navigate(`/summaries?module=${moduleId}&stage=${stage}`)
  }
  function openPractice() {
    if (hasStageQuestions === false) { showToast('No questions added for this stage yet'); return }
    navigate(`/mcq?module=${moduleId}&stage=${stage}`)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>

        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback={`/module/${moduleId}`} />
        </div>

        <EntityPageHeader
          icon={meta.Icon ? <meta.Icon color={meta.color} size={44} /> : <span style={{ fontSize: 44 }}>{meta.emoji}</span>}
          title={meta.title}
          titleColor={meta.color}
          moduleIcon={module.icon}
          moduleName={module.name}
        />

        <StudyMaterialsSection dark={dark} moduleId={moduleId as string} presentFileTypes={presentFileTypes} driveUrl={driveUrl} />

        {/* Links carry ?stage= so SubjectPage narrows its lesson list to this stage */}
        <StudyByLessonSection dark={dark} moduleId={moduleId as string} subjects={subjects} stage={stage} />

        {/* Smart Summaries & Practice — each toasts instead of navigating when empty */}
        <div className="summary-practice-row" style={{ marginBottom: 32 }}>
          <div>
            <h2 style={{ ...pulseType.sectionLabel, color: pt.textMuted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SmartSummariesIcon color={pt.textMuted} size={14} /> Smart Summaries
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
            <h2 style={{ ...pulseType.sectionLabel, color: pt.textMuted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PracticeIcon color={pt.textMuted} size={14} /> Practice
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
