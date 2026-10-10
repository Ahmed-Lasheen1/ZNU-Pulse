// src/pages/mcq/MCQBrowse.tsx
import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../../premiumTheme'
import ErrorBanner from '../../components/ErrorBanner'
import TabRow from '../../components/TabRow'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PageShell from '../../components/pulse/PageShell'
import PulseGlassRow from '../../components/pulse/PulseGlassRow'
import LoadingText from '../../components/pulse/LoadingText'
import { ModuleIcon, ExamIcon } from '../../lib/medicalIcons'
import { OfflineIcon, BookIcon, PauseIcon, PlayIcon, EmptyBoxIcon, GraduationCapIcon, TargetIcon } from '../../components/ui/tool-icons'
import { MCQ_ACCENT, EXAM_LOW_SHADOW } from './mcqShared'
import { stagesOf, inStage } from '../../lib/lessonStages'
import { simulatorPool } from '../../lib/stageSimulator'

interface SimulatorRow {
  stage: string
  subject_id: string
  question_count: number
}

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
  simulatorRows: SimulatorRow[]
  simulatorLoading: boolean
  getFilteredQuestions: (type: string, sourceOnly?: string | null) => any[]
  onStartQuiz: (type: string, subjectId?: string | null, lessonId?: string | null, sourceFilter?: string | null) => void
  onStartSimulator: (stage: string) => void
}

interface SourceChoice {
  type: 'mock' | 'practice'
  subjectId: string | null
  lessonId: string | null
  allCount: number
  doctorCount: number
}

function CountText({ children }: { children: ReactNode }) {
  return (
    <span style={{
      display: 'inline-block', color: '#fff', fontSize: 12, fontWeight: 600,
      fontFamily: pulseFonts.body, whiteSpace: 'nowrap', textShadow: EXAM_LOW_SHADOW,
    }}>{children}</span>
  )
}

const countLabel = (n: number) => `${n} question${n === 1 ? '' : 's'}`

function SourceChoiceDialog({
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
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="source-choice-dialog-title" style={{ width: '100%', maxWidth: 380 }}>
        <LiquidGlassCard dark={dark} delay={0} instant style={{ padding: '26px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <GraduationCapIcon color={MCQ_ACCENT} size={30} />
          </div>
          <h3 id="source-choice-dialog-title" style={{ ...pulseType.sectionTitle, fontSize: 16, color: pt.textPrimary, marginBottom: 6, fontFamily: pulseFonts.display }}>
            This selection has University Doctors' questions
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

interface SubjectAccordionRowProps {
  dark: boolean
  sub: any
  count: number
  tabAccentColor: string
  delay: number
  lessonRows: { lesson: any; count: number }[]
  expanded: boolean
  forceOpen: boolean
  onToggle: () => void
  onPracticeSubject: () => void
  onPracticeLesson: (lessonId: string) => void
}

function SubjectAccordionRow({
  dark, sub, count, tabAccentColor, delay, lessonRows, expanded, forceOpen, onToggle, onPracticeSubject, onPracticeLesson
}: SubjectAccordionRowProps) {
  const pt = getPulseTheme(dark)
  const hasLessons = lessonRows.length > 0
  const canExpand = hasLessons && !forceOpen
  const isOpen = hasLessons && (forceOpen || expanded)
  const panelId = `subject-lessons-${sub.id}`
  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'

  return (
    <LiquidGlassCard dark={dark} delay={delay} style={{ padding: 0 }}>
      <style>{`
        .mcq-subject-toggle { transition: background 0.15s ease; }
        .mcq-subject-toggle:active { background: var(--mcq-sbl-hover); }
        @media (hover: hover) { .mcq-subject-toggle:hover { background: var(--mcq-sbl-hover); } }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
        <button
          type="button"
          onClick={canExpand ? onToggle : undefined}
          aria-expanded={canExpand ? isOpen : undefined}
          aria-controls={canExpand ? panelId : undefined}
          disabled={!canExpand}
          className="mcq-subject-toggle"
          style={{
            ['--mcq-sbl-hover' as any]: canExpand ? hoverTint : 'transparent',
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent', border: 'none', padding: 0, textAlign: 'left',
            cursor: canExpand ? 'pointer' : 'default', font: 'inherit', color: 'inherit'
          }}
        >
          <ModuleIcon value={sub.icon} size={18} color={sub.color || tabAccentColor} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: pt.textPrimary, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</div>
            <div style={{ color: pt.textMuted, fontSize: 11.5, marginTop: 1 }}>{countLabel(count)}</div>
          </span>
          {canExpand && (
            <span style={{ display: 'inline-flex', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }}>
              <ChevronDown size={16} color={pt.textMuted} />
            </span>
          )}
        </button>
        <button onClick={onPracticeSubject} style={{
          background: MCQ_ACCENT, color: '#0f172a', border: 'none', padding: '8px 16px',
          borderRadius: 999, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: pulseFonts.body,
          flexShrink: 0
        }}>Practice All</button>
      </div>

      {hasLessons && (
        <div style={{
          display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr',
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'grid-template-rows 0.25s ease, visibility 0.25s'
        }}>
          <div style={{ overflow: 'hidden' }}>
            <div
              id={panelId} role="region" aria-label={`${sub.name} lessons`} aria-hidden={!isOpen}
              style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              {lessonRows.map(({ lesson, count: lessonQCount }) => (
                <PulseGlassRow
                  key={lesson.id} dark={dark} radius={12}
                  hoverTint={hoverTint}
                  onClick={() => onPracticeLesson(lesson.id)}
                  role="button" tabIndex={isOpen ? 0 : -1}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPracticeLesson(lesson.id) } }}
                >
                  <div style={{ padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: pt.textPrimary, fontSize: 13, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</span>
                    <span style={{ color: pt.textMuted, fontSize: 11, flexShrink: 0 }}>{countLabel(lessonQCount)}</span>
                  </div>
                </PulseGlassRow>
              ))}
            </div>
          </div>
        </div>
      )}
    </LiquidGlassCard>
  )
}

export default function MCQBrowse({
  dark, modulesError, loadError, usingCache, resumeData, onResume, onDiscardResume,
  activeModuleObj, stages, activeStage, onSelectStage,
  moduleSubjects, activeSubject, onSelectSubject,
  loading, questions, lessons, lessonStageMap, simulatorRows, simulatorLoading,
  getFilteredQuestions, onStartQuiz, onStartSimulator
}: MCQBrowseProps) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'
  const [sourceChoice, setSourceChoice] = useState<SourceChoice | null>(null)
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null)

  const tabAccentColor = activeModuleObj?.color || pt.cobalt
  const stageActive = activeStage !== 'all'

  const stagesWithQuestions = new Set(questions.flatMap(q => stagesOf(q, lessonStageMap)))
  const visibleStages = stages.filter(s => stagesWithQuestions.has(s.value))

  const mockQuestions = getFilteredQuestions('mock')

  function practiceScope(subjectId: string | null, lessonId: string | null) {
    return questions.filter(q =>
      (lessonId ? q.lesson_id === lessonId : q.subject_id === subjectId) &&
      (q.exam_type === 'practice' || q.exam_type === 'both') &&
      inStage(q, activeStage, lessonStageMap)
    )
  }

  // With a stage selected, only subjects/lessons that actually have questions in it are listed.
  const stageSubjectIds = new Set(
    questions.filter(q => inStage(q, activeStage, lessonStageMap)).map(q => q.subject_id)
  )
  const tabSubjects = stageActive ? moduleSubjects.filter(s => stageSubjectIds.has(s.id)) : moduleSubjects

  const subjectRows = moduleSubjects
    .map(sub => {
      const lessonRows = lessons
        .filter(l => l.subject_id === sub.id)
        .map(lesson => ({ lesson, count: practiceScope(null, lesson.id).length }))
        .filter(r => !stageActive || r.count > 0)
      return { sub, count: practiceScope(sub.id, null).length, lessonRows }
    })
    .filter(r => !stageActive || r.count > 0 || r.lessonRows.length > 0)

  useEffect(() => {
    if (loading || !stageActive || activeSubject === 'all') return
    if (!tabSubjects.some(s => s.id === activeSubject)) onSelectSubject('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeStage, activeSubject, questions])

  const stageSimRows = stageActive ? simulatorRows.filter(r => r.stage === activeStage) : []
  const simTotal = stageSimRows.reduce(
    (sum, r) => sum + Math.min(r.question_count, simulatorPool(questions, r.subject_id, activeStage, lessonStageMap).length), 0
  )
  const simSubjectCount = stageSimRows.filter(
    r => simulatorPool(questions, r.subject_id, activeStage, lessonStageMap).length > 0
  ).length
  const stageTitle = stages.find(s => s.value === activeStage)?.title || 'Stage'

  const simulatorShown = stageActive && !loading && !simulatorLoading && simTotal > 0
  const mockHidden = stageActive && (loading || simulatorLoading || simulatorShown)

  function requestStart(type: 'mock' | 'practice', subjectId: string | null, lessonId: string | null, scope: any[]) {
    const doctorCount = scope.filter(q => q.source === 'university').length
    if (doctorCount > 0 && doctorCount < scope.length) {
      setSourceChoice({ type, subjectId, lessonId, allCount: scope.length, doctorCount })
      return
    }
    onStartQuiz(type, subjectId, lessonId)
  }

  function handleStartMock() {
    requestStart('mock', null, null, mockQuestions)
  }
  function handlePracticeSubject(subjectId: string) {
    requestStart('practice', subjectId, null, practiceScope(subjectId, null))
  }
  function handlePracticeLesson(lessonId: string) {
    requestStart('practice', null, lessonId, practiceScope(null, lessonId))
  }

  function chooseAll() {
    if (!sourceChoice) return
    const { type, subjectId, lessonId } = sourceChoice
    setSourceChoice(null)
    onStartQuiz(type, subjectId, lessonId)
  }
  function chooseDoctors() {
    if (!sourceChoice) return
    const { type, subjectId, lessonId } = sourceChoice
    setSourceChoice(null)
    onStartQuiz(type, subjectId, lessonId, 'university')
  }

  const singleSubject = subjectRows.length === 1

  return (
    <PageShell dark={dark} backFallback="/" maxWidth={900}>
      {(loadError || modulesError) && <ErrorBanner />}
      {usingCache && (
        <div style={{ marginBottom: 16 }}>
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: '10px 16px', textAlign: 'center' }}>
            <span style={{ color: pt.amber, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <OfflineIcon color={pt.amber} size={14} /> You're offline — showing questions saved from your last visit. Quizzes still work and are saved on this device.
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

      {loading && <LoadingText />}

      {!mockHidden && (
        <div style={{ marginBottom: 32 }}>
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: '22px 24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: tabSubjects.length > 0 ? 16 : 0 }}>
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
            {tabSubjects.length > 0 && (
              <TabRow
                items={[{ value: 'all', label: 'All' }, ...tabSubjects.map(sub => ({ value: sub.id, label: sub.name }))]}
                active={activeSubject}
                onSelect={onSelectSubject}
                dark={dark}
                accentColor={MCQ_ACCENT}
                style={{ marginBottom: 0 }}
              />
            )}
          </LiquidGlassCard>
        </div>
      )}

      {simulatorShown && (
        <div style={{ marginBottom: 32 }}>
          <style>{`
            .sim-sub-short { display: none; }
            @media (max-width: 480px) {
              .sim-sub-full { display: none; }
              .sim-sub-short { display: inline; }
            }
          `}</style>
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18, flexShrink: 0,
                background: `${MCQ_ACCENT}22`, border: `1px solid ${MCQ_ACCENT}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <TargetIcon color={MCQ_ACCENT} size={28} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <h3 style={{ ...pulseType.sectionLabel, fontSize: 15, color: MCQ_ACCENT, marginBottom: 6 }}>{stageTitle} Simulator</h3>
                <CountText>
                  <span className="sim-sub-full">{countLabel(simTotal)} · {simSubjectCount} subject{simSubjectCount === 1 ? '' : 's'} · new mix each time</span>
                  <span className="sim-sub-short">{countLabel(simTotal)} · {simSubjectCount} subject{simSubjectCount === 1 ? '' : 's'}</span>
                </CountText>
              </div>
              <button onClick={() => onStartSimulator(activeStage)} style={{
                background: MCQ_ACCENT, color: '#0f172a', border: 'none', padding: '12px 24px',
                borderRadius: 999, fontWeight: 800, cursor: 'pointer', fontFamily: pulseFonts.body, flexShrink: 0
              }}>Start →</button>
            </div>
          </LiquidGlassCard>
        </div>
      )}

      <h3 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16 }}>Practice by Subject</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {subjectRows.map(({ sub, count, lessonRows }, i) => (
          <SubjectAccordionRow
            key={sub.id}
            dark={dark}
            sub={sub}
            count={count}
            tabAccentColor={tabAccentColor}
            delay={i * 70}
            lessonRows={lessonRows}
            expanded={expandedSubjectId === sub.id}
            forceOpen={singleSubject}
            onToggle={() => setExpandedSubjectId(prev => prev === sub.id ? null : sub.id)}
            onPracticeSubject={() => handlePracticeSubject(sub.id)}
            onPracticeLesson={handlePracticeLesson}
          />
        ))}
        {subjectRows.length === 0 && !loading && (
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ color: pt.sub, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <EmptyBoxIcon color={pt.sub} size={16} /> {stageActive ? 'No questions in this stage yet' : 'No subjects for this module yet'}
            </p>
          </LiquidGlassCard>
        )}
      </div>

      <SourceChoiceDialog
        dark={dark}
        open={!!sourceChoice}
        allCount={sourceChoice?.allCount ?? 0}
        doctorCount={sourceChoice?.doctorCount ?? 0}
        onCancel={() => setSourceChoice(null)}
        onChooseAll={chooseAll}
        onChooseDoctors={chooseDoctors}
      />
    </PageShell>
  )
}
