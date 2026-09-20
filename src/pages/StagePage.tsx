// src/pages/StagePage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PageShell from '../components/pulse/PageShell'
import ModuleNotFoundState from '../components/pulse/ModuleNotFoundState'
import EntityPageHeader from '../components/pulse/EntityPageHeader'
import StudyMaterialsSection from '../components/pulse/StudyMaterialsSection'
import StudyByLessonSection from '../components/pulse/StudyByLessonSection'
import SummaryOverlay from '../components/SummaryOverlay'
import { useToast } from '../components/ToastProvider'
import { useModules } from '../contexts'
import { fetchModuleStages, stageMetaFrom } from '../lib/moduleStages'
import { fetchSubjectsForModule } from '../lib/subjects'
import { fetchDriveUrl } from '../lib/siteSettings'
import { fetchLessonStageMap, inStage } from '../lib/lessonStages'
import { useHistoryOverlay } from '../lib/useHistoryOverlay'
import { getPreviewUrl } from '../lib/embedUrl'
import { ExamIcon, NotesIcon } from '../lib/medicalIcons'
import { SmartSummariesIcon, PracticeIcon } from '@/components/ui/tool-icons'

interface PageModule { id: string; name: string; icon?: string | null; color: string }
interface PageSubject { id: string; module_id: string; name: string; icon?: string | null; color?: string | null }
interface ExamStage { value: string; title: string; emoji?: string; Icon?: (p: { color: string; size?: number }) => JSX.Element; color: string }
interface Summary { id: string; title: string; url: string; exam_stage?: string | null; lesson_id?: string | null }

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
  const [summariesLoaded, setSummariesLoaded] = useState(false)
  const [hasStageQuestions, setHasStageQuestions] = useState<boolean | null>(null)
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [subjects, setSubjects] = useState<PageSubject[]>([])

  useHistoryOverlay(!!selectedSummary, () => setSelectedSummary(null))

  useEffect(() => {
    let ignore = false
    fetchModuleStages(moduleId!).then(result => { if (!ignore) setStages(result) })
    return () => { ignore = true }
  }, [moduleId])

  useEffect(() => {
    let ignore = false
    fetchDriveUrl().then(url => { if (!ignore) setDriveUrl(url) })
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false
    setSummariesLoaded(false)

    // Everything in the module is fetched once and narrowed to this
    // stage in the browser: an item belongs here through its own stage
    // tag OR its lesson's stages, and is counted once either way.
    Promise.all([
      supabase.from('files').select('type, exam_stage, lesson_id').eq('module_id', moduleId),
      supabase.from('summaries').select('*').eq('module_id', moduleId).order('created_at'),
      supabase.from('questions_public').select('id, exam_stage, lesson_id').eq('module_id', moduleId),
      fetchLessonStageMap(),
    ]).then(([filesRes, summariesRes, questionsRes, stageMapRes]) => {
      if (ignore) return
      const map = stageMapRes.map
      const here = (row: any) => inStage(row, stage!, map)

      if (filesRes.data) setPresentFileTypes(new Set(filesRes.data.filter(here).map((f: any) => f.type)))
      if (filesRes.error) setLoadError(true)

      if (summariesRes.data) setSummaries(summariesRes.data.filter(here))
      if (summariesRes.error) setLoadError(true)
      setSummariesLoaded(true)

      if (questionsRes.data) setHasStageQuestions(questionsRes.data.filter(here).length > 0)
      if (questionsRes.error) setLoadError(true)
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
    <PageShell dark={dark} backFallback={`/module/${moduleId}`}>
      <EntityPageHeader
        icon={meta.Icon ? <meta.Icon color={meta.color} size={44} /> : <span style={{ fontSize: 44 }}>{meta.emoji}</span>}
        title={meta.title}
        titleColor={meta.color}
        moduleIcon={module.icon}
        moduleName={module.name}
      />

      <StudyMaterialsSection dark={dark} moduleId={moduleId as string} presentFileTypes={presentFileTypes} driveUrl={driveUrl} />

      <StudyByLessonSection dark={dark} moduleId={moduleId as string} subjects={subjects} stage={stage} />

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
    </PageShell>
  )
}
