// src/pages/LessonPage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import ErrorBanner from '../components/ErrorBanner'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../components/pulse/PulseBackground'
import BackButton from '../components/pulse/BackButton'
import SummaryOverlay from '../components/SummaryOverlay'
import { useModules } from '../contexts'
import { fetchLessonById } from '../lib/lessons'
import { useHistoryOverlay } from '../lib/useHistoryOverlay'
import { getPreviewUrl } from '../lib/embedUrl'
import { ModuleIcon, ExamIcon, NotesIcon } from '../lib/medicalIcons'
import { SmartSummariesIcon, PracticeIcon, ConstructionIcon } from '@/components/ui/tool-icons'

interface PageModule { id: string; name: string; icon?: string | null; color: string }
interface Lesson { id: string; title: string; icon?: string | null }
interface Summary { id: string; title: string; url: string }

export default function LessonPage({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const { moduleId, subjectId, lessonId } = useParams()
  const navigate = useNavigate()
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: PageModule[]; modulesLoaded: boolean; modulesError: boolean }
  const module = modules.find(m => m.id === moduleId) || null
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [questionCount, setQuestionCount] = useState(0)
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)
  const [showSummaryPicker, setShowSummaryPicker] = useState(false)

  useHistoryOverlay(!!selectedSummary, () => setSelectedSummary(null))

  useEffect(() => {
    let ignore = false
    setLoading(true)
    Promise.all([
      fetchLessonById(lessonId!),
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('lesson_id', lessonId),
      supabase.from('summaries').select('*').eq('lesson_id', lessonId).order('created_at')
    ]).then(([lessonRes, countRes, summaryRes]) => {
      if (ignore) return
      setLesson(lessonRes.lesson)
      if (countRes.count != null) setQuestionCount(countRes.count)
      if (summaryRes.data) setSummaries(summaryRes.data)
      if (lessonRes.error || summaryRes.error) setLoadError(true)
      setLoading(false)
    })
    return () => { ignore = true }
  }, [lessonId])

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

  function openSummary() {
    if (summaries.length === 0) return
    if (summaries.length === 1) setSelectedSummary(summaries[0])
    else setShowSummaryPicker(prev => !prev)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>

        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback={`/module/${moduleId}/subject/${subjectId}`} />
        </div>

        {loading && <p style={{ color: ON_GRADIENT_TOP.secondary, textAlign: 'center' }}>Loading...</p>}
        {loadError && <ErrorBanner />}

        {lesson && (
          <>
            <div style={{ textAlign: 'center', padding: '10px 0 30px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                {lesson.icon
                  ? <ModuleIcon value={lesson.icon} size={44} color={pt.success} />
                  : <NotesIcon color={pt.success} size={44} />}
              </div>
              <h1 style={{ ...pulseType.pageTitle, fontSize: 24, color: pt.success, marginBottom: 6 }}>{lesson.title}</h1>
              <div style={{ color: ON_GRADIENT_TOP.secondary, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ModuleIcon value={module.icon} size={14} color={ON_GRADIENT_TOP.secondary} /> {module.name}
              </div>
            </div>

            {/* Summary & Practice — side by side from tablet width up
                (.summary-practice-row, see index.css), stacked on
                phones. Same layout as ModulePage/StagePage's Smart
                Summaries + Practice pairing. */}
            <div className="summary-practice-row" style={{ marginBottom: 32 }}>
              <div>
                <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SmartSummariesIcon color={ON_GRADIENT_TOP.muted} size={14} /> Summary
                </h2>
                {summaries.length > 0 ? (
                  <LiquidGlassCard dark={dark} delay={0} onClick={openSummary} style={{ padding: 24, textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                      <NotesIcon color={pt.success} size={30} />
                    </div>
                    <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>
                      {summaries.length === 1 ? 'Open Lesson Summary' : 'Summaries'}
                    </div>
                    {summaries.length > 1 && (
                      <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>{summaries.length} available</div>
                    )}
                  </LiquidGlassCard>
                ) : (
                  <LiquidGlassCard dark={dark} delay={0} style={{ padding: 32, textAlign: 'center' }}>
                    <p style={{ color: pt.sub, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <ConstructionIcon color={pt.sub} size={13} /> No summary added yet
                    </p>
                  </LiquidGlassCard>
                )}

                {showSummaryPicker && summaries.length > 1 && (
                  <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                    {summaries.map((s, i) => (
                      <LiquidGlassCard key={s.id} dark={dark} delay={i * 60} onClick={() => setSelectedSummary(s)}
                        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <NotesIcon color={pt.success} size={16} />
                        <span style={{ color: pt.textPrimary, fontSize: 13, fontWeight: 600 }}>{s.title}</span>
                      </LiquidGlassCard>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PracticeIcon color={ON_GRADIENT_TOP.muted} size={14} /> Practice
                </h2>
                {questionCount > 0 ? (
                  <LiquidGlassCard dark={dark} delay={0} onClick={() => navigate(`/mcq?module=${moduleId}&lesson=${lessonId}`)} style={{ padding: 24, textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                      <ExamIcon color="#e2725b" size={30} />
                    </div>
                    <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>Practice This Lesson</div>
                    <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>{questionCount} question{questionCount === 1 ? '' : 's'}</div>
                  </LiquidGlassCard>
                ) : (
                  <LiquidGlassCard dark={dark} delay={0} style={{ padding: 32, textAlign: 'center' }}>
                    <p style={{ color: pt.sub, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <ConstructionIcon color={pt.sub} size={13} /> No questions tagged to this lesson yet
                    </p>
                  </LiquidGlassCard>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
