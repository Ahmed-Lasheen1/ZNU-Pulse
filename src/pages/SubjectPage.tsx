// src/pages/SubjectPage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import ErrorBanner from '../components/ErrorBanner'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../components/pulse/PulseBackground'
import BackButton from '../components/pulse/BackButton'
import ModuleNotFoundState from '../components/pulse/ModuleNotFoundState'
import EntityPageHeader from '../components/pulse/EntityPageHeader'
import AutoGrid from '../components/AutoGrid'
import SummaryOverlay from '../components/SummaryOverlay'
import { useToast } from '../components/ToastProvider'
import { useModules } from '../contexts'
import { fetchSubjectById } from '../lib/subjects'
import { fetchLessonsForSubject } from '../lib/lessons'
import { useHistoryOverlay } from '../lib/useHistoryOverlay'
import { getPreviewUrl } from '../lib/embedUrl'
import { ModuleIcon, ExamIcon, NotesIcon } from '../lib/medicalIcons'
import { BookIcon, ConstructionIcon } from '../components/ui/tool-icons'

interface PageModule { id: string; name: string; icon?: string | null; color: string }
interface Subject { id: string; name: string; icon?: string | null; color?: string | null }
interface Lesson { id: string; title: string; icon?: string | null; summary_url?: string | null }
interface LessonSummary { id: string; title: string; url: string; lesson_id: string }

export default function SubjectPage({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const { moduleId, subjectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const showToast = useToast() as (message: string) => void
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: PageModule[]; modulesLoaded: boolean; modulesError: boolean }
  const module = modules.find(m => m.id === moduleId) || null

  // Reached from a stage page: only show lessons tagged to this exact stage.
  const stageParam = new URLSearchParams(location.search).get('stage')

  const [subject, setSubject] = useState<Subject | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [stageLessonIds, setStageLessonIds] = useState<Set<string> | null>(null)
  const [lessonSummaries, setLessonSummaries] = useState<LessonSummary[]>([])
  // null = not checked yet (never blocks a click); false = confirmed empty.
  const [hasSubjectQuestions, setHasSubjectQuestions] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [selectedSummary, setSelectedSummary] = useState<{ title: string; url: string } | null>(null)
  const [showSummaryPicker, setShowSummaryPicker] = useState(false)

  useHistoryOverlay(!!selectedSummary, () => setSelectedSummary(null))

  useEffect(() => {
    let ignore = false
    setLoading(true)
    Promise.all([
      fetchSubjectById(subjectId!),
      fetchLessonsForSubject(subjectId!),
      supabase.from('summaries').select('id, title, url, lesson_id').eq('subject_id', subjectId).not('lesson_id', 'is', null),
      supabase.from('questions_public').select('id', { count: 'exact', head: true }).eq('subject_id', subjectId),
    ]).then(async ([subjectRes, lessonRes, summaryRes, questionCountRes]) => {
      if (ignore) return
      setSubject(subjectRes.subject)
      setLessons(lessonRes.lessons)
      if (summaryRes.data) setLessonSummaries(summaryRes.data)
      setHasSubjectQuestions((questionCountRes.count || 0) > 0)
      if (subjectRes.error || lessonRes.error || summaryRes.error || questionCountRes.error) setLoadError(true)

      if (stageParam) {
        // Union of lesson_ids with a file/question/summary tagged to this stage.
        const [filesRes, questionsRes, stageSummaryRes] = await Promise.all([
          supabase.from('files').select('lesson_id').eq('subject_id', subjectId).eq('exam_stage', stageParam).not('lesson_id', 'is', null),
          supabase.from('questions_public').select('lesson_id').eq('subject_id', subjectId).eq('exam_stage', stageParam).not('lesson_id', 'is', null),
          supabase.from('summaries').select('lesson_id').eq('subject_id', subjectId).eq('exam_stage', stageParam).not('lesson_id', 'is', null),
        ])
        if (ignore) return
        const ids = new Set<string>()
        ;[filesRes, questionsRes, stageSummaryRes].forEach(res => {
          if (res.error) { setLoadError(true); return }
          (res.data || []).forEach((row: any) => { if (row.lesson_id) ids.add(row.lesson_id) })
        })
        setStageLessonIds(ids)
      } else {
        setStageLessonIds(null)
      }

      setLoading(false)
    })
    return () => { ignore = true }
  }, [subjectId, stageParam])

  if (!module) return (
    <ModuleNotFoundState hasError={loadError || modulesError} loaded={modulesLoaded} />
  )

  if (selectedSummary) return (
    <SummaryOverlay dark={dark} onBack={() => setSelectedSummary(null)} title={selectedSummary.title} url={getPreviewUrl(selectedSummary.url)} />
  )

  function openAllSummaries() {
    if (lessonSummaries.length === 0) { showToast('No summaries added for this subject yet'); return }
    if (lessonSummaries.length === 1) {
      const s = lessonSummaries[0]
      setSelectedSummary({ title: s.title, url: s.url })
    } else {
      setShowSummaryPicker(prev => !prev)
    }
  }

  function openAllMcqs() {
    if (hasSubjectQuestions === false) { showToast('No MCQs added for this subject yet'); return }
    navigate(`/mcq?module=${moduleId}&subject=${subjectId}`)
  }

  // Applied only once stageLessonIds resolves (loading stays true until then).
  const visibleLessons = stageParam && stageLessonIds
    ? lessons.filter(l => stageLessonIds.has(l.id))
    : lessons

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>

        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback={stageParam ? `/module/${moduleId}/stage/${stageParam}` : `/module/${moduleId}`} />
        </div>

        <EntityPageHeader
          icon={subject?.icon
            ? <ModuleIcon value={subject.icon} size={44} color={subject?.color || pt.success} />
            : <BookIcon color={subject?.color || pt.success} size={44} />}
          title={subject ? subject.name : ''}
          titleColor={subject?.color || pt.success}
          moduleIcon={module.icon}
          moduleName={module.name}
        />

        {/* Both buttons toast (plain style) instead of navigating into an empty page */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, justifyContent: 'center' }}>
          <LiquidGlassCard dark={dark} delay={0} onClick={openAllMcqs}
            style={{ width: 'clamp(130px, 32vw, 180px)', padding: '22px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <ExamIcon color="#e2725b" size={28} />
              <span style={{ color: '#e2725b', fontWeight: 700, fontSize: 14 }}>All MCQs</span>
            </div>
          </LiquidGlassCard>
          <LiquidGlassCard dark={dark} delay={0} onClick={openAllSummaries}
            style={{ width: 'clamp(130px, 32vw, 180px)', padding: '22px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <NotesIcon color={pt.success} size={28} />
              <span style={{ color: pt.success, fontWeight: 700, fontSize: 14 }}>All Summaries</span>
            </div>
          </LiquidGlassCard>
        </div>

        {showSummaryPicker && lessonSummaries.length > 1 && (
          <div style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
            {lessonSummaries.map((s, i) => (
              <LiquidGlassCard key={s.id} dark={dark} delay={i * 60}
                onClick={() => setSelectedSummary({ title: s.title, url: s.url })}
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <NotesIcon color={pt.success} size={16} />
                <span style={{ color: pt.textPrimary, fontSize: 13, fontWeight: 600 }}>{s.title}</span>
              </LiquidGlassCard>
            ))}
          </div>
        )}

        {loading && <p style={{ color: ON_GRADIENT_TOP.secondary, textAlign: 'center' }}>Loading...</p>}
        {loadError && <ErrorBanner />}

        {!loading && visibleLessons.length === 0 && (
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <ConstructionIcon color={pt.sub} size={14} />
              {stageParam ? 'No lessons tagged to this exam stage yet' : 'No lessons here yet'}
            </p>
          </LiquidGlassCard>
        )}

        {visibleLessons.length > 0 && (
          <AutoGrid>
            {visibleLessons.map((lesson, i) => (
              <LiquidGlassCard key={lesson.id} dark={dark} delay={i * 80}
                onClick={() => navigate(`/module/${moduleId}/subject/${subjectId}/lesson/${lesson.id}`)}
                style={{ padding: 'clamp(20px, 2vw, 28px)', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  {lesson.icon
                    ? <ModuleIcon value={lesson.icon} size={36} color={pt.success} />
                    : <NotesIcon color={pt.success} size={36} />}
                </div>
                <div style={{ ...pulseType.cardTitle, fontSize: 'clamp(13px, 1.1vw, 16px)', color: pt.textPrimary }}>{lesson.title}</div>
              </LiquidGlassCard>
            ))}
          </AutoGrid>
        )}
      </div>
    </div>
  )
}
