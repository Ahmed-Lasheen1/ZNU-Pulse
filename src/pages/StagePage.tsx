// src/pages/StagePage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
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
import { fetchLessonsForModule } from '../lib/lessons'
import { fetchDriveUrl } from '../lib/siteSettings'
import { fetchLessonStageMap, inStage } from '../lib/lessonStages'
import { fetchModuleFacets, fetchModuleQuestions, fetchModuleSummaries } from '../lib/moduleContent'
import { fetchSimulatorConfig, simulatorPool } from '../lib/stageSimulator'
import { useHistoryOverlay } from '../lib/useHistoryOverlay'
import { getPreviewUrl } from '../lib/embedUrl'
import { ExamIcon, NotesIcon } from '../lib/medicalIcons'
import { SmartSummariesIcon, PracticeIcon, TargetIcon } from '@/components/ui/tool-icons'
import { MCQ_ACCENT } from './mcq/mcqShared'

interface PageModule { id: string; name: string; icon?: string | null; color: string }
interface PageSubject { id: string; module_id: string; name: string; icon?: string | null; color?: string | null }
interface StageLesson { id: string; title: string; icon?: string | null; subject_id: string }
interface ExamStage { value: string; title: string; emoji?: string; Icon?: (p: { color: string; size?: number }) => JSX.Element; color: string }
interface Summary { id: string; title: string; url: string; exam_stage?: string | null; lesson_id?: string | null }
interface ContentFacet { kind: 'file' | 'question' | 'summary'; item_type: string | null; exam_stage: string | null; lesson_id: string | null }

const countLabel = (n: number) => `${n} question${n === 1 ? '' : 's'}`

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
  const [simStats, setSimStats] = useState({ total: 0, subjects: 0 })
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [subjects, setSubjects] = useState<PageSubject[]>([])
  const [lessons, setLessons] = useState<StageLesson[]>([])
  const [lessonQuestionIds, setLessonQuestionIds] = useState<Set<string>>(new Set())
  const [lessonSummaries, setLessonSummaries] = useState<Record<string, Summary[]>>({})

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
    setSimStats({ total: 0, subjects: 0 })
    async function loadSimulatorStats() {
      const { rows } = await fetchSimulatorConfig(moduleId!)
      const stageRows = rows.filter((r: any) => r.stage === stage && r.question_count > 0)
      if (ignore || stageRows.length === 0) return
      const [qRes, mapRes] = await Promise.all([fetchModuleQuestions(moduleId!), fetchLessonStageMap()])
      if (ignore) return
      const questions = qRes.data || []
      let total = 0
      let subjectCount = 0
      stageRows.forEach((r: any) => {
        const pool = simulatorPool(questions, r.subject_id, stage, mapRes.map).length
        total += Math.min(r.question_count, pool)
        if (pool > 0) subjectCount++
      })
      setSimStats({ total, subjects: subjectCount })
    }
    loadSimulatorStats()
    return () => { ignore = true }
  }, [moduleId, stage])

  useEffect(() => {
    let ignore = false
    setSummariesLoaded(false)
    setHasStageQuestions(null)

    Promise.all([
      fetchModuleFacets(moduleId!),
      fetchModuleSummaries(moduleId!),
      fetchLessonStageMap(),
      fetchLessonsForModule(moduleId!),
    ]).then(([facetsRes, summariesRes, stageMapRes, lessonsRes]) => {
      if (ignore) return
      const map = stageMapRes.map
      const here = (row: any) => inStage(row, stage!, map)
      const stageLessonIds = new Set<string>()

      if (facetsRes.data) {
        const rows = facetsRes.data as ContentFacet[]
        setPresentFileTypes(new Set(rows.filter(r => r.kind === 'file' && here(r)).map(r => r.item_type as string)))
        setHasStageQuestions(rows.some(r => r.kind === 'question' && here(r)))
        setLessonQuestionIds(new Set(rows.filter(r => r.kind === 'question' && here(r) && r.lesson_id).map(r => r.lesson_id as string)))
        rows.forEach(r => { if (here(r) && r.lesson_id) stageLessonIds.add(r.lesson_id) })
      }
      if (facetsRes.error) setLoadError(true)

      if (summariesRes.data) {
        const stageSummaries = summariesRes.data.filter(here)
        setSummaries(stageSummaries)
        const byLesson: Record<string, Summary[]> = {}
        stageSummaries.forEach((s: Summary) => {
          if (s.lesson_id) { (byLesson[s.lesson_id] ||= []).push(s); stageLessonIds.add(s.lesson_id) }
        })
        setLessonSummaries(byLesson)
      }
      if (summariesRes.error) setLoadError(true)

      if (lessonsRes.lessons) setLessons(lessonsRes.lessons.filter((l: StageLesson) => stageLessonIds.has(l.id)))
      if (lessonsRes.error) setLoadError(true)

      setSummariesLoaded(true)
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
  function openSimulator() {
    navigate(`/mcq?module=${moduleId}&stage=${stage}&simulator=1`)
  }

  const simulatorVisible = simStats.total > 0 && hasStageQuestions !== false
  const subjectText = `${simStats.subjects} subject${simStats.subjects === 1 ? '' : 's'}`

  return (
    <PageShell dark={dark} backFallback={`/module/${moduleId}`} maxWidth={900}>
      <EntityPageHeader
        icon={meta.Icon ? <meta.Icon color={meta.color} size={44} /> : <span style={{ fontSize: 44 }}>{meta.emoji}</span>}
        title={meta.title}
        titleColor={meta.color}
        moduleIcon={module.icon}
        moduleName={module.name}
      />

      <StudyMaterialsSection dark={dark} moduleId={moduleId as string} presentFileTypes={presentFileTypes} driveUrl={driveUrl} />

      <StudyByLessonSection
        dark={dark}
        moduleId={moduleId as string}
        subjects={subjects}
        lessons={lessons}
        lessonQuestionIds={lessonQuestionIds}
        lessonSummaries={lessonSummaries}
        onOpenSummary={setSelectedSummary}
      />

      {simulatorVisible && (
        <div style={{ marginBottom: 32 }}>
          <style>{`
            .sim-sub-short { display: none; }
            .sim-row { display: flex; align-items: center; gap: 18px; }
            .sim-icon { width: 60px; height: 60px; border-radius: 18px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
            .sim-text { flex: 1; min-width: 0; }
            .sim-btn { flex-shrink: 0; white-space: nowrap; padding: 12px 24px; }
            @media (max-width: 480px) {
              .sim-sub-full { display: none; }
              .sim-sub-short { display: inline; }
              .sim-row { gap: 12px; }
              .sim-icon { width: 48px; height: 48px; border-radius: 14px; }
              .sim-btn { padding: 10px 16px; font-size: 13px !important; }
            }
          `}</style>
          <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TargetIcon color={ON_GRADIENT_TOP.muted} size={14} /> Exam Simulator
          </h2>
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 24px' }}>
            <div className="sim-row">
              <div className="sim-icon" style={{
                background: `${MCQ_ACCENT}22`, border: `1px solid ${MCQ_ACCENT}55`
              }}>
                <TargetIcon color={MCQ_ACCENT} size={28} />
              </div>
              <div className="sim-text">
                <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>{meta.title} Simulator</div>
                <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>
                  <span className="sim-sub-full">{countLabel(simStats.total)} · {subjectText} · new mix each time</span>
                  <span className="sim-sub-short">{countLabel(simStats.total)} · {subjectText}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={openSimulator}
                className="sim-btn glass-focus-ring"
                style={{
                  background: MCQ_ACCENT, color: '#0f172a', border: 'none', borderRadius: 999,
                  fontWeight: 800, fontSize: 14, fontFamily: pulseFonts.body, cursor: 'pointer'
                }}
              >Start →</button>
            </div>
          </LiquidGlassCard>
        </div>
      )}

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
