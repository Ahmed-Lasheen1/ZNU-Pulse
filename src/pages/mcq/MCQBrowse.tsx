// src/pages/mcq/MCQBrowse.tsx
// Module / subject browsing view — pulled out of MCQ.tsx. Renders the
// "pick a module, pick a stage/subject, start Mock Exam or Practice"
// screen. All quiz state lives in the MCQ.tsx container; this just
// takes props and fires callbacks back up.
import { useNavigate } from 'react-router-dom'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../../premiumTheme'
import ErrorBanner from '../../components/ErrorBanner'
import TabRow from '../../components/TabRow'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../../components/pulse/PulseBackground'
import PulseGlassRow from '../../components/pulse/PulseGlassRow'
import BackButton from '../../components/pulse/BackButton'
import { ModuleIcon, ExamIcon } from '../../lib/medicalIcons'
import { OfflineIcon, BookIcon, PauseIcon, PlayIcon, EmptyBoxIcon } from '../../components/ui/tool-icons'
import { MCQ_ACCENT } from './mcqShared'

interface MCQBrowseProps {
  dark: boolean
  modulesError: boolean
  loadError: boolean
  usingCache: boolean
  resumeData: any
  onResume: () => void
  onDiscardResume: () => void
  activeModuleObj: any
  stages: any[]
  activeStage: string
  onSelectStage: (v: string) => void
  moduleSubjects: any[]
  activeSubject: string
  onSelectSubject: (v: string) => void
  loading: boolean
  questions: any[]
  getFilteredQuestions: (type: string) => any[]
  onStartQuiz: (type: string, subjectId?: string | null) => void
}

export default function MCQBrowse({
  dark, modulesError, loadError, usingCache, resumeData, onResume, onDiscardResume,
  activeModuleObj, stages, activeStage, onSelectStage,
  moduleSubjects, activeSubject, onSelectSubject,
  loading, questions, getFilteredQuestions, onStartQuiz
}: MCQBrowseProps) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>
        {/* Back button only lives on this browsing view — exam mode
            (MCQExamFlow) never renders this, so it can't show up mid-quiz. */}
        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback="/" />
        </div>

        {(loadError || modulesError) && <ErrorBanner />}
        {usingCache && (
          <div style={{ marginBottom: 16 }}>
            <LiquidGlassCard dark={dark} delay={0} style={{ padding: '10px 16px', textAlign: 'center' }}>
              <span style={{ color: pt.amber, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <OfflineIcon color={pt.amber} size={14} /> You're offline — showing questions saved from your last visit. Submitting a quiz needs a connection.
              </span>
            </LiquidGlassCard>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <ExamIcon color={MCQ_ACCENT} size={40} />
          </div>
          <h1 style={{ fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 24, color: ON_GRADIENT_TOP.primary, marginBottom: 4 }}>MCQ Bank</h1>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <PulseGlassRow dark={dark} radius={999} hoverTint={hoverTint} onClick={() => navigate('/review')}
            role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/review') } }}>
            <div style={{ padding: '8px 18px', ...pulseType.small, fontWeight: 700, color: pt.sub, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookIcon color={pt.sub} size={14} /> Review Incorrect & Flagged
            </div>
          </PulseGlassRow>
        </div>

        {resumeData && (
          <div style={{ marginBottom: 20 }}>
            <LiquidGlassCard dark={dark} delay={0} style={{
              padding: '14px 18px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 10, flexWrap: 'wrap'
            }}>
              <div style={{ color: MCQ_ACCENT, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <PauseIcon color={MCQ_ACCENT} size={13} /> Paused {resumeData.quizMode === 'mock' ? 'mock exam' : 'practice quiz'} — {Object.keys(resumeData.answers || {}).length}/{(resumeData.quizQuestions || []).length} answered
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onResume} style={{
                  background: MCQ_ACCENT, color: '#0f172a', border: 'none', padding: '6px 14px',
                  borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: pulseFonts.body,
                  display: 'inline-flex', alignItems: 'center', gap: 5
                }}><PlayIcon color="#0f172a" size={11} /> Continue</button>
                <button onClick={onDiscardResume} style={{
                  background: 'transparent', border: `1px solid ${MCQ_ACCENT}40`, color: MCQ_ACCENT,
                  padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: pulseFonts.body
                }}>Discard</button>
              </div>
            </LiquidGlassCard>
          </div>
        )}

        {activeModuleObj && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            color: activeModuleObj.color, fontWeight: 700, fontSize: 14
          }}>
            <ModuleIcon value={activeModuleObj.icon} size={18} color={activeModuleObj.color} /> {activeModuleObj.name}
          </div>
        )}

        <TabRow
          items={[
            { value: 'all', label: 'All' },
            ...stages.map(s => ({
              value: s.value,
              label: s.Icon ? s.title : `${s.emoji} ${s.title}`,
              Icon: s.Icon,
            })),
          ]}
          active={activeStage}
          onSelect={onSelectStage}
          dark={dark}
          accentColor={MCQ_ACCENT}
          style={{ marginBottom: 16 }}
        />

        <TabRow
          items={[{ value: 'all', label: 'All' }, ...moduleSubjects.map(sub => ({ value: sub.id, label: sub.name }))]}
          active={activeSubject}
          onSelect={onSelectSubject}
          dark={dark}
          accentColor={MCQ_ACCENT}
          style={{ marginBottom: 28 }}
        />

        {loading && <p style={{ color: ON_GRADIENT_TOP.secondary, textAlign: 'center' }}>Loading...</p>}

        {/* Mock Exam — hero banner */}
        <div style={{ marginBottom: 32 }}>
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 24px', flexWrap: 'wrap' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18, flexShrink: 0,
                background: `${MCQ_ACCENT}22`, border: `1px solid ${MCQ_ACCENT}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ExamIcon color={MCQ_ACCENT} size={28} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <h3 style={{ ...pulseType.sectionLabel, fontSize: 15, color: MCQ_ACCENT, marginBottom: 4 }}>Mock Exam</h3>
                <p style={{ color: pt.sub, fontSize: 13 }}>
                  {Math.min(36, getFilteredQuestions('mock').length)} questions · 36 minutes
                </p>
              </div>
              <button onClick={() => onStartQuiz('mock')} style={{
                background: MCQ_ACCENT, color: '#0f172a', border: 'none', padding: '12px 24px',
                borderRadius: 999, fontWeight: 800, cursor: 'pointer', fontFamily: pulseFonts.body, flexShrink: 0
              }}>Start →</button>
            </div>
          </LiquidGlassCard>
        </div>

        {/* Practice by Subject — horizontal scroll-snap carousel. */}
        <h3 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16 }}>Practice by Subject</h3>
        <div style={{
          display: 'flex', gap: 14, overflowX: 'auto',
          paddingTop: 8, paddingBottom: 14, paddingLeft: 2, paddingRight: 2,
          scrollSnapType: 'x mandatory'
        }}>
          {moduleSubjects.map((sub, i) => {
            const subQs = questions.filter(q =>
              q.subject_id === sub.id &&
              (q.exam_type === 'practice' || q.exam_type === 'both') &&
              (activeStage === 'all' || (q.exam_stage || 'general') === activeStage)
            )
            return (
              <div key={sub.id} style={{ flex: '0 0 auto', width: 'clamp(150px, 40vw, 220px)', scrollSnapAlign: 'start' }}>
                <LiquidGlassCard dark={dark} delay={i * 70}
                  onClick={() => onStartQuiz('practice', sub.id)}
                  style={{ padding: '20px 18px', height: '100%' }}>
                  <div style={{ color: pt.textPrimary, fontWeight: 700, marginBottom: 8, fontSize: 15 }}>{sub.name}</div>
                  <div style={{ color: pt.textMuted, fontSize: 12, marginBottom: 16 }}>{subQs.length} questions</div>
                  <div style={{
                    background: MCQ_ACCENT, color: '#0f172a', border: 'none', padding: '7px 0',
                    borderRadius: 999, fontWeight: 700, textAlign: 'center', fontSize: 12, fontFamily: pulseFonts.body
                  }}>Practice</div>
                </LiquidGlassCard>
              </div>
            )
          })}
          {moduleSubjects.length === 0 && !loading && (
            <LiquidGlassCard dark={dark} delay={0} style={{ padding: 24, width: '100%', textAlign: 'center' }}>
              <p style={{ color: pt.sub, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <EmptyBoxIcon color={pt.sub} size={16} /> No subjects for this module yet
              </p>
            </LiquidGlassCard>
          )}
        </div>
      </div>
    </div>
  )
}
