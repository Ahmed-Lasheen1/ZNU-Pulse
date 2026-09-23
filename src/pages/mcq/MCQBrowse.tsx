// src/pages/mcq/MCQBrowse.tsx
// Module / subject browsing view — the "pick a module, pick a
// stage/subject, start Mock Exam or Practice" screen. All quiz state
// lives in MCQ.tsx; this just takes props and fires callbacks back up.
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../../premiumTheme'
import ErrorBanner from '../../components/ErrorBanner'
import TabRow from '../../components/TabRow'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PageShell from '../../components/pulse/PageShell'
import PulseGlassRow from '../../components/pulse/PulseGlassRow'
import LoadingText from '../../components/pulse/LoadingText'
import { ModuleIcon, ExamIcon } from '../../lib/medicalIcons'
import { OfflineIcon, BookIcon, PauseIcon, PlayIcon, EmptyBoxIcon, GraduationCapIcon } from '../../components/ui/tool-icons'
import { MCQ_ACCENT, EXAM_LOW_SHADOW } from './mcqShared'
import { stagesOf, inStage } from '../../lib/lessonStages'

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
  lessons: any[]
  lessonStageMap: Record<string, string[]>
  getFilteredQuestions: (type: string, sourceOnly?: string | null) => any[]
  onStartQuiz: (type: string, subjectId?: string | null, lessonId?: string | null, sourceFilter?: string | null) => void
}

// Plain text with a soft shadow so it stays readable over the gradient.
function CountText({ children }: { children: ReactNode }) {
  return (
    <span style={{
      display: 'inline-block', color: '#fff', fontSize: 12, fontWeight: 600,
      fontFamily: pulseFonts.body, whiteSpace: 'nowrap', textShadow: EXAM_LOW_SHADOW,
    }}>{children}</span>
  )
}

const countLabel = (n: number) => `${n} question${n === 1 ? '' : 's'}`

// Shown before starting a Mock Exam only when this selection mixes
// University Doctors-tagged questions with everything else — lets the
// student pick between the full set or just the doctors' set.
function MockSourceDialog({
  dark, open, allCount, doctorCount, onCancel, onChooseAll, onChooseDoctors
}: {
  dark: boolean
  open: boolean
  allCount: number
  doctorCount: number
  onCancel: () => void
  onChooseAll: () => void
  onChooseDoctors: () => void
}) {
  const pt = getPulseTheme(dark)
  if (!open) return null
  return (
    <div
      role="presentation"
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
      }}
    >
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="mock-source-dialog-title" style={{ width: '100%', maxWidth: 380 }}>
        <LiquidGlassCard dark={dark} delay={0} instant style={{ padding: '26px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <GraduationCapIcon color={MCQ_ACCENT} size={30} />
          </div>
          <h3 id="mock-source-dialog-title" style={{ ...pulseType.sectionTitle, fontSize: 16, color: pt.textPrimary, marginBottom: 6, fontFamily: pulseFonts.display }}>
            This module has University Doctors' questions
          </h3>
          <p style={{ color: pt.sub, fontSize: 13, lineHeight: 1.5, marginBottom: 20, fontFamily: pulseFonts.body }}>
            Include every question, or practice only the ones tagged by University Doctors?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={onChooseAll} style={{
              padding: '12px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: MCQ_ACCENT, color: '#0f172a', fontWeight: 800, fontSize: 13, fontFamily: pulseFonts.body
            }}>All Questions ({allCount})</button>
            <button onClick={onChooseDoctors} style={{
              padding: '12px', borderRadius: 999, cursor: 'pointer',
              background: 'transparent', border: `1.5px solid ${pt.cobalt}`, color: pt.cobalt,
              fontWeight: 800, fontSize: 13, fontFamily: pulseFonts.body,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}><GraduationCapIcon color={pt.cobalt} size={14} /> University Doctors Only ({doctorCount})</button>
            <button onClick={onCancel} style={{
              padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer',
              color: pt.sub, fontSize: 12, fontWeight: 700, fontFamily: pulseFonts.body
            }}>Cancel</button>
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  )
}

export default function MCQBrowse({
  dark, modulesError, loadError, usingCache, resumeData, onResume, onDiscardResume,
  activeModuleObj, stages, activeStage, onSelectStage,
  moduleSubjects, activeSubject, onSelectSubject,
  loading, questions, lessons, lessonStageMap, getFilteredQuestions, onStartQuiz
}: MCQBrowseProps) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'
  const [mockChoiceOpen, setMockChoiceOpen] = useState(false)

  // Tab accent follows the current module's own color, matching Summaries.tsx.
  const tabAccentColor = activeModuleObj?.color || pt.cobalt

  // A stage tab only appears once this module has at least one question in it.
  const stagesWithQuestions = new Set(questions.flatMap(q => stagesOf(q, lessonStageMap)))
  const visibleStages = stages.filter(s => stagesWithQuestions.has(s.value))

  // Only offer the "doctors only" split when the current mock selection
  // actually contains a mix — no point asking when it's all-one or none.
  const mockQuestions = getFilteredQuestions('mock')
  const doctorMockQuestions = mockQuestions.filter(q => q.source === 'university')
  const hasDoctorChoice = doctorMockQuestions.length > 0 && doctorMockQuestions.length < mockQuestions.length

  function handleStartMock() {
    if (hasDoctorChoice) { setMockChoiceOpen(true); return }
    onStartQuiz('mock')
  }
  function chooseAllMock() {
    setMockChoiceOpen(false)
    onStartQuiz('mock')
  }
  function chooseDoctorsMock() {
    setMockChoiceOpen(false)
    onStartQuiz('mock', null, null, 'university')
  }

  // Lessons belonging to this module's subjects, narrowed further by the
  // active subject tab (same scoping the subject carousel below uses).
  const moduleLessons = lessons.filter(l =>
    moduleSubjects.some(s => s.id === l.subject_id) &&
    (activeSubject === 'all' || l.subject_id === activeSubject)
  )

  return (
    <PageShell dark={dark} backFallback="/">
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

      {visibleStages.length > 0 && (
        <TabRow
          items={[
            { value: 'all', label: 'All' },
            ...visibleStages.map(s => ({
              value: s.value,
              label: s.Icon ? s.title : `${s.emoji} ${s.title}`,
              Icon: s.Icon,
            })),
          ]}
          active={activeStage}
          onSelect={onSelectStage}
          dark={dark}
          accentColor={tabAccentColor}
          style={{ marginBottom: 16 }}
        />
      )}

      <TabRow
        items={[{ value: 'all', label: 'All' }, ...moduleSubjects.map(sub => ({ value: sub.id, label: sub.name }))]}
        active={activeSubject}
        onSelect={onSelectSubject}
        dark={dark}
        accentColor={tabAccentColor}
        style={{ marginBottom: 28 }}
      />

      {loading && <LoadingText />}

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
              <h3 style={{ ...pulseType.sectionLabel, fontSize: 15, color: MCQ_ACCENT, marginBottom: 6 }}>Mock Exam</h3>
              <CountText>{loading ? '…' : countLabel(mockQuestions.length)}</CountText>
            </div>
            <button onClick={handleStartMock} style={{
              background: MCQ_ACCENT, color: '#0f172a', border: 'none', padding: '12px 24px',
              borderRadius: 999, fontWeight: 800, cursor: 'pointer', fontFamily: pulseFonts.body, flexShrink: 0
            }}>Start →</button>
          </div>
        </LiquidGlassCard>
      </div>

      {/* Practice by Subject — horizontal scroll-snap carousel */}
      <h3 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16 }}>Practice by Subject</h3>
      <div style={{
        display: 'flex', gap: 14, overflowX: 'auto',
        paddingTop: 8, paddingBottom: 14, paddingLeft: 12, paddingRight: 12,
        scrollSnapType: 'x mandatory'
      }}>
        {moduleSubjects.map((sub, i) => {
          const subQs = questions.filter(q =>
            q.subject_id === sub.id &&
            (q.exam_type === 'practice' || q.exam_type === 'both') &&
            inStage(q, activeStage, lessonStageMap)
          )
          return (
            <div key={sub.id} style={{ flex: '0 0 auto', width: 'clamp(150px, 40vw, 220px)', scrollSnapAlign: 'start' }}>
              <LiquidGlassCard dark={dark} delay={i * 70}
                onClick={() => onStartQuiz('practice', sub.id)}
                style={{ padding: '20px 18px', height: '100%' }}>
                <div style={{ color: pt.textPrimary, fontWeight: 700, marginBottom: 8, fontSize: 15 }}>{sub.name}</div>
                <div style={{ marginBottom: 16 }}>
                  <CountText>{loading ? '…' : countLabel(subQs.length)}</CountText>
                </div>
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

      {/* Practice by Lesson — same carousel treatment, one level deeper */}
      <h3 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, marginTop: 28 }}>Practice by Lesson</h3>
      <div style={{
        display: 'flex', gap: 14, overflowX: 'auto',
        paddingTop: 8, paddingBottom: 14, paddingLeft: 12, paddingRight: 12,
        scrollSnapType: 'x mandatory'
      }}>
        {moduleLessons.map((lesson, i) => {
          const lessonQs = questions.filter(q =>
            q.lesson_id === lesson.id &&
            (q.exam_type === 'practice' || q.exam_type === 'both') &&
            inStage(q, activeStage, lessonStageMap)
          )
          const subj = moduleSubjects.find(s => s.id === lesson.subject_id)
          return (
            <div key={lesson.id} style={{ flex: '0 0 auto', width: 'clamp(150px, 40vw, 220px)', scrollSnapAlign: 'start' }}>
              <LiquidGlassCard dark={dark} delay={i * 70}
                onClick={() => onStartQuiz('practice', null, lesson.id)}
                style={{ padding: '20px 18px', height: '100%' }}>
                <div style={{ color: pt.textPrimary, fontWeight: 700, marginBottom: 4, fontSize: 15 }}>{lesson.title}</div>
                {subj && (
                  <div style={{ color: pt.textMuted, fontSize: 11, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subj.name}</div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <CountText>{loading ? '…' : countLabel(lessonQs.length)}</CountText>
                </div>
                <div style={{
                  background: MCQ_ACCENT, color: '#0f172a', border: 'none', padding: '7px 0',
                  borderRadius: 999, fontWeight: 700, textAlign: 'center', fontSize: 12, fontFamily: pulseFonts.body
                }}>Practice</div>
              </LiquidGlassCard>
            </div>
          )
        })}
        {moduleLessons.length === 0 && !loading && (
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: 24, width: '100%', textAlign: 'center' }}>
            <p style={{ color: pt.sub, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <EmptyBoxIcon color={pt.sub} size={16} /> No lessons for this module yet
            </p>
          </LiquidGlassCard>
        )}
      </div>

      <MockSourceDialog
        dark={dark}
        open={mockChoiceOpen}
        allCount={mockQuestions.length}
        doctorCount={doctorMockQuestions.length}
        onCancel={() => setMockChoiceOpen(false)}
        onChooseAll={chooseAllMock}
        onChooseDoctors={chooseDoctorsMock}
      />
    </PageShell>
  )
}
