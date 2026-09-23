// src/pages/ModulePage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PageShell from '../components/pulse/PageShell'
import ModuleNotFoundState from '../components/pulse/ModuleNotFoundState'
import StudyMaterialsSection from '../components/pulse/StudyMaterialsSection'
import StudyByLessonSection from '../components/pulse/StudyByLessonSection'
import SummaryOverlay from '../components/SummaryOverlay'
import AutoGrid from '../components/AutoGrid'
import { useToast } from '../components/ToastProvider'
import { useModules } from '../contexts'
import { fetchModuleStages } from '../lib/moduleStages'
import { fetchSubjectsForModule } from '../lib/subjects'
import { fetchLessonsForModule } from '../lib/lessons'
import { fetchDriveUrl } from '../lib/siteSettings'
import { fetchLessonStageMap, stagesOf } from '../lib/lessonStages'
import { useHistoryOverlay } from '../lib/useHistoryOverlay'
import { getPreviewUrl } from '../lib/embedUrl'
import { ModuleIcon, ExamIcon, NotesIcon } from '../lib/medicalIcons'
import { ExamStageIcon, SmartSummariesIcon, PracticeIcon } from '@/components/ui/tool-icons'

interface PageModule {
  id: string; name: string; icon?: string | null; color: string; status: 'active' | 'completed'
}
interface PageSubject { id: string; module_id: string; name: string; icon?: string | null; color?: string | null }
interface PageLesson { id: string; title: string; icon?: string | null; subject_id: string }
interface ModuleSummary { id: string; title: string; url: string }
interface ExamStage { value: string; title: string; emoji?: string; Icon?: (p: { color: string; size?: number }) => JSX.Element; color: string }
interface ContentFacet { kind: 'file' | 'question' | 'summary'; item_type: string | null; exam_stage: string | null; lesson_id: string | null }

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
  const [stagesWithContent, setStagesWithContent] = useState<Set<string>>(new Set())
  const [subjects, setSubjects] = useState<PageSubject[]>([])
  const [lessons, setLessons] = useState<PageLesson[]>([])
  const [lessonQuestionIds, setLessonQuestionIds] = useState<Set<string>>(new Set())
  const [lessonSummaries, setLessonSummaries] = useState<Record<string, ModuleSummary[]>>({})
  const [selectedSummary, setSelectedSummary] = useState<ModuleSummary | null>(null)
  const [hasModuleSummaries, setHasModuleSummaries] = useState<boolean | null>(null)
  const [hasModuleQuestions, setHasModuleQuestions] = useState<boolean | null>(null)

  useHistoryOverlay(!!selectedSummary, () => setSelectedSummary(null))

  useEffect(() => {
    let ignore = false
    fetchDriveUrl().then(url => { if (!ignore && url) setDriveUrl(url) })
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false

    fetchModuleStages(moduleId!).then(result => { if (!ignore) setExamStages(result) })

    fetchSubjectsForModule(moduleId!).then(({ subjects, error }) => {
      if (ignore) return
      setSubjects(subjects)
      if (error) setLoadError(true)
    })

    fetchLessonsForModule(moduleId!).then(({ lessons, error }) => {
      if (ignore) return
      setLessons(lessons)
      if (error) setLoadError(true)
    })

    // Lesson-linked summaries, for the accordion's inline "Summary" action.
    supabase.from('summaries').select('id, title, url, lesson_id').eq('module_id', moduleId).not('lesson_id', 'is', null)
      .then(({ data, error }) => {
        if (ignore) return
        if (data) {
          const byLesson: Record<string, ModuleSummary[]> = {}
          data.forEach((s: any) => { (byLesson[s.lesson_id] ||= []).push(s) })
          setLessonSummaries(byLesson)
        }
        if (error) setLoadError(true)
      })

    Promise.all([
      supabase.rpc('get_module_content_facets', { p_module_id: moduleId }),
      fetchLessonStageMap(),
    ]).then(([facetsRes, stageMapRes]) => {
      if (ignore) return
      if (facetsRes.error) { setLoadError(true); return }

      const rows = (facetsRes.data || []) as ContentFacet[]
      setPresentFileTypes(new Set(rows.filter(r => r.kind === 'file').map(r => r.item_type as string)))
      setHasModuleQuestions(rows.some(r => r.kind === 'question'))
      setHasModuleSummaries(rows.some(r => r.kind === 'summary'))
      setLessonQuestionIds(new Set(rows.filter(r => r.kind === 'question' && r.lesson_id).map(r => r.lesson_id as string)))

      const stages = new Set<string>()
      rows.forEach(row => { stagesOf(row, stageMapRes.map).forEach((s: string) => stages.add(s)) })
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

  if (selectedSummary) return (
    <SummaryOverlay dark={dark} onBack={() => setSelectedSummary(null)} title={selectedSummary.title} url={getPreviewUrl(selectedSummary.url)} />
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
    <PageShell dark={dark} backFallback="/" maxWidth={900}>
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

      <StudyByLessonSection
        dark={dark}
        moduleId={moduleId as string}
        subjects={subjects}
        lessons={lessons}
        lessonQuestionIds={lessonQuestionIds}
        lessonSummaries={lessonSummaries}
        onOpenSummary={setSelectedSummary}
      />

      <StudyMaterialsSection dark={dark} moduleId={moduleId as string} presentFileTypes={presentFileTypes} driveUrl={driveUrl} />

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
    </PageShell>
  )
}
