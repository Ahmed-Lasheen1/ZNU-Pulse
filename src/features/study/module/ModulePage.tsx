import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import PageShell from '@/shared/ui/layout/PageShell'
import ModuleNotFoundState from '@/features/study/module/ModuleNotFoundState'
import StudyMaterialsSection from '@/features/study/module/StudyMaterialsSection'
import StudyByLessonSection from '@/features/study/module/StudyByLessonSection'
import StageTabs from '@/features/study/module/StageTabs'
import { PageSectionsSkeleton } from '@/shared/ui/feedback/Skeletons'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import { SummaryOverlay } from '@/features/study/summaries'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import { useModules } from '@/core/contexts'
import { fetchModuleStages, stageMetaFrom } from '@/services/content/moduleStages'
import { fetchSubjectsForModule } from '@/services/content/subjects'
import { fetchLessonsForModule } from '@/services/content/lessons'
import { fetchDriveUrl } from '@/services/content/siteSettings'
import { fetchLessonStageMap, inStage, stagesOf } from '@/services/content/lessonStages'
import { fetchModuleFacets, fetchModuleQuestions, fetchModuleSummaries } from '@/services/content/moduleContent'
import { fetchSimulatorConfig, simulatorPool } from '@/services/exam/stageSimulator'
import { useHistoryOverlay } from '@/shared/hooks/useHistoryOverlay'
import { getPreviewUrl } from '@/shared/utils/embedUrl'
import { ModuleIcon, ExamIcon, NotesIcon } from '@/shared/icons/medicalIcons'
import { ExamStageIcon, SmartSummariesIcon, PracticeIcon, TargetIcon } from '@/shared/icons/tool-icons'
import { MCQ_ACCENT } from '@/shared/theme/accents'
import { countLabel } from '@/shared/utils/format'

interface PageModule {
  id: string; name: string; icon?: string | null; color: string; status: 'active' | 'completed'
}
interface PageSubject { id: string; module_id: string; name: string; icon?: string | null; color?: string | null }
interface PageLesson { id: string; title: string; icon?: string | null; subject_id: string }
interface ModuleSummary { id: string; title: string; url: string; exam_stage?: string | null; lesson_id?: string | null }
interface ExamStage { value: string; title: string; emoji?: string; Icon?: (p: { color: string; size?: number }) => JSX.Element; color: string }
interface ContentFacet { kind: 'file' | 'question' | 'summary'; item_type: string | null; exam_stage: string | null; lesson_id: string | null }
interface SimulatorRow { stage: string; subject_id: string; question_count: number }

export default function ModulePage({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const showToast = useToast() as (message: string, type?: 'success' | 'error') => void
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: PageModule[]; modulesLoaded: boolean; modulesError: boolean }
  const module = modules.find(m => m.id === moduleId) || null

  const [loadError, setLoadError] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [examStages, setExamStages] = useState<ExamStage[]>([])
  const [subjects, setSubjects] = useState<PageSubject[]>([])
  const [lessons, setLessons] = useState<PageLesson[]>([])
  const [facets, setFacets] = useState<ContentFacet[]>([])
  const [summaries, setSummaries] = useState<ModuleSummary[]>([])
  const [stageMap, setStageMap] = useState<Record<string, string[]>>({})
  const [simRows, setSimRows] = useState<SimulatorRow[]>([])
  const [simStats, setSimStats] = useState({ total: 0, subjects: 0 })
  const [selectedSummary, setSelectedSummary] = useState<ModuleSummary | null>(null)
  const [contentLoaded, setContentLoaded] = useState(false)

  useHistoryOverlay(!!selectedSummary, () => setSelectedSummary(null))

  // Memoized so the stage tabs keep a stable identity between renders.
  const visibleExamStages = useMemo(() => {
    const withContent = new Set<string>()
    facets.forEach(row => { stagesOf(row, stageMap).forEach((s: string) => withContent.add(s)) })
    return examStages.filter(stage => withContent.has(stage.value))
  }, [examStages, facets, stageMap])

  const tabItems = useMemo(
    () => visibleExamStages.map(s => ({ value: s.value, title: s.title, color: s.color, emoji: s.emoji, Icon: s.Icon })),
    [visibleExamStages]
  )

  const requestedStage = searchParams.get('stage') || 'all'
  const activeStage = requestedStage !== 'all' && contentLoaded && !visibleExamStages.some(s => s.value === requestedStage)
    ? 'all'
    : requestedStage
  const stageActive = activeStage !== 'all'

  useEffect(() => {
    let ignore = false
    fetchDriveUrl().then(url => { if (!ignore && url) setDriveUrl(url) })
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false

    setContentLoaded(false)
    setFacets([])
    setSummaries([])
    setSimRows([])

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

    fetchSimulatorConfig(moduleId!).then(({ rows }) => { if (!ignore) setSimRows(rows as SimulatorRow[]) })

    Promise.all([
      fetchModuleFacets(moduleId!),
      fetchModuleSummaries(moduleId!),
      fetchLessonStageMap(),
    ]).then(([facetsRes, summariesRes, stageMapRes]) => {
      if (ignore) return
      if (facetsRes.error || summariesRes.error) setLoadError(true)
      setFacets((facetsRes.data || []) as ContentFacet[])
      setSummaries((summariesRes.data || []) as ModuleSummary[])
      setStageMap(stageMapRes.map)
      setContentLoaded(true)
    })

    return () => { ignore = true }
  }, [moduleId])

  useEffect(() => {
    let ignore = false
    setSimStats({ total: 0, subjects: 0 })
    if (!stageActive) return
    const stageRows = simRows.filter(r => r.stage === activeStage && r.question_count > 0)
    if (stageRows.length === 0) return
    fetchModuleQuestions(moduleId!).then(({ data }) => {
      if (ignore) return
      const questions = data || []
      let total = 0
      let subjectCount = 0
      stageRows.forEach(r => {
        const pool = simulatorPool(questions, r.subject_id, activeStage, stageMap).length
        total += Math.min(r.question_count, pool)
        if (pool > 0) subjectCount++
      })
      setSimStats({ total, subjects: subjectCount })
    })
    return () => { ignore = true }
  }, [moduleId, activeStage, stageActive, simRows, stageMap])

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

  const here = (row: any) => inStage(row, activeStage, stageMap)
  const stageFacets = facets.filter(here)
  const stageSummaries = summaries.filter(here)

  const presentFileTypes = new Set(stageFacets.filter(r => r.kind === 'file').map(r => r.item_type as string))
  const hasQuestions = stageFacets.some(r => r.kind === 'question')
  const lessonQuestionIds = new Set(stageFacets.filter(r => r.kind === 'question' && r.lesson_id).map(r => r.lesson_id as string))

  const lessonSummaries: Record<string, ModuleSummary[]> = {}
  const stageLessonIds = new Set<string>()
  stageSummaries.forEach(s => {
    if (!s.lesson_id) return
    ;(lessonSummaries[s.lesson_id] ||= []).push(s)
    stageLessonIds.add(s.lesson_id)
  })
  stageFacets.forEach(r => { if (r.lesson_id) stageLessonIds.add(r.lesson_id) })
  const visibleLessons = stageActive ? lessons.filter(l => stageLessonIds.has(l.id)) : lessons

  const meta = stageActive ? stageMetaFrom(examStages, activeStage) : null
  const stageName = meta ? meta.title : 'this module'

  function selectStage(value: string | null) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set('stage', value)
      else next.delete('stage')
      return next
    }, { replace: true })
  }

  function openSummaries() {
    if (contentLoaded && stageSummaries.length === 0) { showToast(`No summaries added for ${stageName} yet`); return }
    if (stageActive && stageSummaries.length === 1) { setSelectedSummary(stageSummaries[0]); return }
    navigate(`/summaries?module=${moduleId}${stageActive ? `&stage=${activeStage}` : ''}`)
  }
  function openPractice() {
    if (contentLoaded && !hasQuestions) { showToast(`No questions added for ${stageName} yet`); return }
    navigate(`/mcq?module=${moduleId}${stageActive ? `&stage=${activeStage}` : ''}`)
  }
  function openSimulator() {
    navigate(`/mcq?module=${moduleId}&stage=${activeStage}&simulator=1`)
  }

  const simulatorVisible = stageActive && simStats.total > 0 && hasQuestions
  const subjectText = `${simStats.subjects} subject${simStats.subjects === 1 ? '' : 's'}`

  return (
    <PageShell dark={dark} backFallback="/" maxWidth={900}>
      <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <ModuleIcon value={module.icon} size={52} color={module.color} />
        </div>
        <h1 style={{ ...pulseType.pageTitle, fontSize: 26, color: module.color, marginBottom: 6, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{module.name}</h1>
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

      {loadError && <div style={{ marginBottom: 24 }}><ErrorBanner message="Some content couldn't load — check your connection." /></div>}

      {!contentLoaded && <PageSectionsSkeleton />}

      {visibleExamStages.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ExamStageIcon color={ON_GRADIENT_TOP.muted} size={14} /> Exam Stage
          </h2>
          <StageTabs dark={dark} items={tabItems} active={stageActive ? activeStage : null} onSelect={selectStage} />
        </div>
      )}

      {contentLoaded && (
        <>
          <StudyByLessonSection
            dark={dark}
            moduleId={moduleId as string}
            subjects={subjects}
            lessons={visibleLessons}
            lessonQuestionIds={lessonQuestionIds}
            lessonSummaries={lessonSummaries}
            onOpenSummary={setSelectedSummary}
          />

          <StudyMaterialsSection dark={dark} moduleId={moduleId as string} presentFileTypes={presentFileTypes} driveUrl={driveUrl} />
        </>
      )}

      {simulatorVisible && meta && (
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
              <div className="sim-icon" style={{ background: `${MCQ_ACCENT}22`, border: `1px solid ${MCQ_ACCENT}55` }}>
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
                style={{ background: MCQ_ACCENT, color: '#0f172a', border: 'none', borderRadius: 999, fontWeight: 800, fontSize: 14, fontFamily: pulseFonts.body, cursor: 'pointer' }}
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
            <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>{stageActive ? 'Summaries' : 'All Summaries'}</div>
            <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>
              {!stageActive
                ? 'View summaries for this module'
                : stageSummaries.length === 0
                  ? `${stageName} summaries`
                  : stageSummaries.length === 1 ? stageSummaries[0].title : `${stageSummaries.length} available`}
            </div>
          </LiquidGlassCard>
        </div>

        <div>
          <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PracticeIcon color={ON_GRADIENT_TOP.muted} size={14} /> Practice
          </h2>
          <LiquidGlassCard dark={dark} delay={0} onClick={openPractice} style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <ExamIcon color={MCQ_ACCENT} size={30} />
            </div>
            <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>MCQ Bank</div>
            <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>
              {stageActive ? `Practice ${stageName} questions` : 'Practice questions for this module'}
            </div>
          </LiquidGlassCard>
        </div>
      </div>
    </PageShell>
  )
}
