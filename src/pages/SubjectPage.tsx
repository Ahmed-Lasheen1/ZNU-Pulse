// src/pages/SubjectPage.tsx
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

function gridCols(n: number) { return n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : 4 }

export default function SubjectPage({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const { moduleId, subjectId } = useParams()
  const navigate = useNavigate()
  const showToast = useToast() as (message: string) => void
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: PageModule[]; modulesLoaded: boolean; modulesError: boolean }
  const module = modules.find(m => m.id === moduleId) || null
  const [subject, setSubject] = useState<Subject | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lessonSummaries, setLessonSummaries] = useState<LessonSummary[]>([])
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
      // Lesson-scoped summaries live in `summaries` (via lesson_id) —
      // there is no `lessons.summary_url` column.
      supabase.from('summaries').select('id, title, url, lesson_id').eq('subject_id', subjectId).not('lesson_id', 'is', null)
    ]).then(([subjectRes, lessonRes, summaryRes]) => {
      if (ignore) return
      setSubject(subjectRes.subject)
      setLessons(lessonRes.lessons)
      if (summaryRes.data) setLessonSummaries(summaryRes.data)
      if (subjectRes.error || lessonRes.error || summaryRes.error) setLoadError(true)
      setLoading(false)
    })
    return () => { ignore = true }
  }, [subjectId])

  if (!module) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: 24, textAlign: 'center', color: ON_GRADIENT_TOP.secondary }}>
        {(loadError || modulesError)
          ? <ErrorBanner message="Couldn't load this — check your connection." />
          : !modulesLoaded ? 'Loading...' : "This module doesn't exist or was removed."}
      </div>
    </div>
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

  // Same reasoning as ModulePage/StagePage's renderFileCard: a single
  // lesson used to still go through the full-width `.auto-grid`
  // (gridCols(1) === 1 column stretched to the row's whole width) —
  // pulled the card markup out here so it can be reused unchanged
  // inside `.auto-grid-single` for that one-lesson case below.
  const renderLessonCard = (lesson: Lesson, i: number) => (
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
            {subject?.icon
              ? <ModuleIcon value={subject.icon} size={44} color={subject?.color || pt.success} />
              : <BookIcon color={subject?.color || pt.success} size={44} />}
          </div>
          <h1 style={{ ...pulseType.pageTitle, fontSize: 24, color: subject?.color || pt.success, marginBottom: 6 }}>{subject ? subject.name : ''}</h1>
          <div style={{ color: ON_GRADIENT_TOP.secondary, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ModuleIcon value={module.icon} size={14} color={ON_GRADIENT_TOP.secondary} /> {module.name}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 28, justifyContent: 'center' }}>
          <LiquidGlassCard dark={dark} delay={0} onClick={() => navigate(`/mcq?module=${moduleId}&subject=${subjectId}`)}
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

        {!loading && lessons.length === 0 && (
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <ConstructionIcon color={pt.sub} size={14} /> No lessons here yet
            </p>
          </LiquidGlassCard>
        )}

        {lessons.length > 0 && (
          lessons.length === 1 ? (
            <div className="auto-grid-single">{renderLessonCard(lessons[0], 0)}</div>
          ) : (
            <div className="auto-grid" style={{ ['--auto-grid-cols' as any]: gridCols(lessons.length) }}>
              {lessons.map(renderLessonCard)}
            </div>
          )
        )}
      </div>
    </div>
  )
}
