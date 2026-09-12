import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../components/pulse/PulseBackground'
import BackButton from '../components/pulse/BackButton'
import ModuleNotFoundState from '../components/pulse/ModuleNotFoundState'
import StudyMaterialsSection from '../components/pulse/StudyMaterialsSection'
import StudyByLessonSection from '../components/pulse/StudyByLessonSection'
import AutoGrid from '../components/AutoGrid'
import { useToast } from '../components/ToastProvider'
import { useModules } from '../contexts'
import { fetchModuleStages } from '../lib/moduleStages'
import { fetchSubjectsForModule } from '../lib/subjects'
import { ModuleIcon, ExamIcon, NotesIcon } from '../lib/medicalIcons'
import { ExamStageIcon, SmartSummariesIcon, PracticeIcon } from '@/components/ui/tool-icons'

interface PageModule {
  id: string; name: string; icon?: string | null; color: string; status: 'active' | 'completed'
}
interface ExamStage { value: string; title: string; emoji?: string; Icon?: (p: { color: string; size?: number }) => JSX.Element; color: string }

export default function ModulePage({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const showToast = useToast() as (message: string, type?: 'success' | 'error') => void
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: PageModule[]; modulesLoaded: boolean; modulesError: boolean }
  const module = modules.find(m => m.id === moduleId) || null

  const [presentFileTypes, setPresentFileTypes] = useState<Set<string>>(new Set())
  const [loadError, setLoadError] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [examStages, setExamStages] = useState<ExamStage[]>([])
  // Only stages that actually have tagged content (file/question/summary) are shown.
  const [stagesWithContent, setStagesWithContent] = useState<Set<string>>(new Set())
  const [subjects, setSubjects] = useState<{ id: string; module_id: string; name: string; icon?: string | null; color?: string | null }[]>([])
  // null = not checked yet (never blocks a click); false = confirmed empty.
  const [hasModuleSummaries, setHasModuleSummaries] = useState<boolean | null>(null)
  const [hasModuleQuestions, setHasModuleQuestions] = useState<boolean | null>(null)

  useEffect(() => {
    let ignore = false
    supabase.from('site_settings').select('value').eq('key', 'drive_url').single()
      .then(({ data }) => { if (!ignore && data?.value) setDriveUrl(data.value) })
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false
    supabase.from('files').select('type').eq('module_id', moduleId)
      .then(({ data, error }) => {
        if (ignore) return
        if (data) setPresentFileTypes(new Set(data.map((f: any) => f.type)))
        if (error) setLoadError(true)
      })
    fetchModuleStages(moduleId!).then(result => { if (!ignore) setExamStages(result) })
    fetchSubjectsForModule(moduleId!).then(({ subjects, error }) => {
      if (ignore) return
      setSubjects(subjects)
      if (error) setLoadError(true)
    })

    supabase.from('summaries').select('id', { count: 'exact', head: true }).eq('module_id', moduleId)
      .then(({ count, error }) => {
        if (ignore) return
        setHasModuleSummaries((count || 0) > 0)
        if (error) setLoadError(true)
      })
    supabase.from('questions_public').select('id', { count: 'exact', head: true }).eq('module_id', moduleId)
      .then(({ count, error }) => {
        if (ignore) return
        setHasModuleQuestions((count || 0) > 0)
        if (error) setLoadError(true)
      })

    // Union of exam_stage values with at least one tagged file/question/summary.
    Promise.all([
      supabase.from('files').select('exam_stage').eq('module_id', moduleId).not('exam_stage', 'is', null),
      supabase.from('questions_public').select('exam_stage').eq('module_id', moduleId).not('exam_stage', 'is', null),
      supabase.from('summaries').select('exam_stage').eq('module_id', moduleId).not('exam_stage', 'is', null),
    ]).then(([filesRes, questionsRes, summariesRes]) => {
      if (ignore) return
      const stages = new Set<string>()
      ;[filesRes, questionsRes, summariesRes].forEach(res => {
        if (res.error) { setLoadError(true); return }
        (res.data || []).forEach((row: any) => { if (row.exam_stage) stages.add(row.exam_stage) })
      })
      setStagesWithContent(stages)
    })

    return () => { ignore = true }
  }, [moduleId])

  if (!module) return (
    <ModuleNotFoundState
      hasError={loadError || modulesError}
      loaded={modulesLoaded}
      errorMessage="Couldn't load this module — check your connection."
    />
  )

  const visibleExamStages = examStages.filter(stage => stagesWithContent.has(stage.value))

  function openAllSummaries() {
    if (hasModuleSummaries === false) { showToast('No summaries added for this module yet'); return }
    navigate(`/summaries?module=${moduleId}`)
  }
  function openPractice() {
    if (hasModuleQuestions === false) { showToast('No questions added for this module yet'); return }
    navigate(`/mcq?module=${moduleId}`)
  }

  const renderStageCard = (stage: ExamStage, i: number) => (
    <LiquidGlassCard key={stage.value} dark={dark} delay={i * 80}
      onClick={() => navigate(`/module/${moduleId}/stage/${stage.value}`)}
      style={{ padding: 'clamp(20px, 2vw, 28px)', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        {stage.Icon
          ? <stage.Icon color={stage.color} size={38} />
          : <span style={{ fontSize: 'clamp(28px, 3vw, 42px)' }}>{stage.emoji}</span>}
      </div>
      <div style={{ ...pulseType.cardTitle, fontSize: 'clamp(13px, 1.1vw, 16px)', color: pt.textPrimary }}>{stage.title}</div>
    </LiquidGlassCard>
  )

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>

        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback="/" />
        </div>

        <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <ModuleIcon value={module.icon} size={52} color={module.color} />
          </div>
          <h1 style={{ ...pulseType.pageTitle, fontSize: 26, color: module.color, marginBottom: 6 }}>{module.name}</h1>
          <div style={{
            display: 'inline-block',
            background: module.status === 'active' ? 'rgba(74,222,128,0.14)' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
            color: module.status === 'active' ? '#4ade80' : ON_GRADIENT_TOP.muted,
            border: `1px solid ${module.status === 'active' ? 'rgba(74,222,128,0.35)' : pt.border}`,
            borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 700
          }}>
            {module.status === 'active' ? '● Active' : '✓ Completed'}
          </div>
        </div>

        {/* Exam Stage — hidden entirely when no stage has tagged content */}
        {visibleExamStages.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ExamStageIcon color={ON_GRADIENT_TOP.muted} size={14} /> Exam Stage
            </h2>
            <AutoGrid>
              {visibleExamStages.map(renderStageCard)}
            </AutoGrid>
          </div>
        )}

        <StudyByLessonSection dark={dark} moduleId={moduleId as string} subjects={subjects} />

        <StudyMaterialsSection dark={dark} moduleId={moduleId as string} presentFileTypes={presentFileTypes} driveUrl={driveUrl} />

        {/* Smart Summaries & Practice — each checks it has content before navigating */}
        <div className="summary-practice-row" style={{ marginBottom: 32 }}>
          <div>
            <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SmartSummariesIcon color={ON_GRADIENT_TOP.muted} size={14} /> Smart Summaries
            </h2>
            <LiquidGlassCard dark={dark} delay={0} onClick={openAllSummaries} style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <NotesIcon color={pt.success} size={30} />
              </div>
              <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>All Summaries</div>
              <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>View summaries for this module</div>
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
              <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>Practice questions for this module</div>
            </LiquidGlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}
