import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPulseTheme, pulseFonts, pulseType } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import OfflineNote from '@/shared/ui/feedback/OfflineNote'
import EmptyState from '@/shared/ui/feedback/EmptyState'
import DialogShell from '@/shared/ui/feedback/DialogShell'
import Button from '@/shared/ui/controls/Button'
import TabRow from '@/shared/ui/controls/TabRow'
import ActionCard from '@/shared/ui/layout/ActionCard'
import SectionHeader from '@/shared/ui/layout/SectionHeader'
import SubjectAccordion, { AccordionRow } from '@/shared/ui/layout/SubjectAccordion'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import PageShell from '@/shared/ui/layout/PageShell'
import PageIntro from '@/shared/ui/layout/PageIntro'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
import { CardRowsSkeleton } from '@/shared/ui/feedback/Skeletons'
import { ModuleIcon, ExamIcon } from '@/shared/icons/medicalIcons'
import { BookIcon, PauseIcon, PlayIcon, EmptyBoxIcon, GraduationCapIcon } from '@/shared/icons/tool-icons'
import { useWeakSpots } from '@/features/practice/mcq/useWeakSpots'
import SimulatorCard from '@/features/practice/SimulatorCard'
import { MCQ_ACCENT } from '@/shared/theme/accents'
import { ON_ACCENT } from '@/shared/theme/tokens'
import { stagesOf, inStage } from '@/services/content/lessonStages'
import { simulatorPool, simulatorTotal, QUIZ_MAX_QUESTIONS } from '@/services/exam/stageSimulator'
import { WEAK_BELOW } from '@/services/history/weakSpots'
import { quizName } from '@/features/practice/quizNames'
import { glassHoverTint } from '@/shared/theme/liquidGlass'
import { accuracyColor } from '@/shared/utils/accuracy'
import { countLabel, plural } from '@/shared/utils/format'

interface SimulatorRow {
  stage: string
  subject_id: string
  question_count: number
}

interface SourceChoiceInfo {
  allCount: number
  doctorCount: number
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
  getPracticeQuestions: (subjectId: string | null, lessonId: string | null, sourceOnly?: string | null) => any[]
  onStartQuiz: (type: 'mock' | 'practice', subjectId?: string | null, lessonId?: string | null) => void
  onStartSimulator: (stage: string) => void
  sourceChoice: SourceChoiceInfo | null
  onChooseAll: () => void
  onChooseDoctors: () => void
  onCancelChoice: () => void
}

// Most weak lessons listed at once.
const MAX_WEAK_SPOTS = 3

// Small counter text shown under quiz cards.
function CountText({ children, dark }: { children: ReactNode; dark: boolean }) {
  const pt = getPulseTheme(dark)
  return (
    <span style={{
      display: 'inline-block', color: pt.textSecondary, fontSize: 12, fontWeight: 600,
      fontFamily: pulseFonts.body, whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

// Asks whether to practice with every question or only University Doctors' questions.
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
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <DialogShell open={open} onClose={onCancel} labelledBy="source-choice-dialog-title" maxWidth={380} initialFocusRef={cancelRef}>
      <LiquidGlassCard dark={dark} delay={0} instant style={{ padding: '26px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <GraduationCapIcon color={adaptColor(MCQ_ACCENT, dark)} size={30} />
        </div>
        <h3 id="source-choice-dialog-title" style={{ ...pulseType.sectionTitle, fontSize: 16, color: pt.textPrimary, marginBottom: 6, fontFamily: pulseFonts.display }}>
          This selection has University Doctors' questions
        </h3>
        <p style={{ color: pt.sub, fontSize: 13, lineHeight: 1.5, marginBottom: 20, fontFamily: pulseFonts.body }}>
          Include every question, or practice only the ones tagged by University Doctors?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button dark={dark} variant="solid" size="md" color={MCQ_ACCENT} fullWidth onClick={onChooseAll} style={{ padding: '12px', fontSize: 13 }}>
            All Questions ({allCount})
          </Button>
          <Button
            dark={dark} variant="outline" size="md" color={pt.cobalt} fullWidth onClick={onChooseDoctors}
            style={{ padding: '12px', fontSize: 13, border: `1.5px solid ${pt.cobalt}` }}
          >
            <GraduationCapIcon color={pt.cobalt} size={14} /> University Doctors Only ({doctorCount})
          </Button>
          <button ref={cancelRef} onClick={onCancel} style={{
            padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: pt.sub, fontSize: 12, fontWeight: 700, fontFamily: pulseFonts.body
          }}>Cancel</button>
        </div>
      </LiquidGlassCard>
    </DialogShell>
  )
}

// MCQ browse page: resume card, mock exam, stage simulator, weak spots and practice by subject.
export default function MCQBrowse({
  dark, modulesError, loadError, usingCache, resumeData, onResume, onDiscardResume,
  activeModuleObj, stages, activeStage, onSelectStage,
  moduleSubjects, activeSubject, onSelectSubject,
  loading, questions, lessons, lessonStageMap, simulatorRows, simulatorLoading,
  getFilteredQuestions, getPracticeQuestions, onStartQuiz, onStartSimulator,
  sourceChoice, onChooseAll, onChooseDoctors, onCancelChoice
}: MCQBrowseProps) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const hoverTint = glassHoverTint(dark)
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null)
  const lessonAccuracy = useWeakSpots(questions)

  // The accent and the module color as text/icon colors, adjusted to stay readable in the current mode (fills keep the original).
  const mcqText = adaptColor(MCQ_ACCENT, dark)
  const moduleText = activeModuleObj ? adaptColor(activeModuleObj.color, dark) : pt.cobalt

  const tabAccentColor = activeModuleObj?.color || pt.cobalt
  const stageActive = activeStage !== 'all'

  const stagesWithQuestions = new Set(questions.flatMap(q => stagesOf(q, lessonStageMap)))
  const visibleStages = stages.filter(s => stagesWithQuestions.has(s.value))

  const mockBank = getFilteredQuestions('mock').length
  const mockCount = Math.min(mockBank, QUIZ_MAX_QUESTIONS)

  const stageSubjectIds = new Set(
    questions.filter(q => inStage(q, activeStage, lessonStageMap)).map(q => q.subject_id)
  )
  const tabSubjects = stageActive ? moduleSubjects.filter(s => stageSubjectIds.has(s.id)) : moduleSubjects

  const subjectRows = moduleSubjects
    .map(sub => {
      const lessonRows = lessons
        .filter(l => l.subject_id === sub.id)
        .map(lesson => ({ lesson, count: getPracticeQuestions(null, lesson.id).length }))
        .filter(r => !stageActive || r.count > 0)
      return { sub, count: getPracticeQuestions(sub.id, null).length, lessonRows }
    })
    .filter(r => !stageActive || r.count > 0 || r.lessonRows.length > 0)

  // Lessons of the current view that have practice questions and an accuracy below the weak-spot line, weakest first.
  const weakSpots = subjectRows
    .flatMap(({ sub, lessonRows }) => lessonRows
      .filter(r => r.count > 0 && lessonAccuracy[r.lesson.id])
      .map(r => ({ lesson: r.lesson, subject: sub, stat: lessonAccuracy[r.lesson.id] })))
    .filter(r => r.stat.accuracy < WEAK_BELOW)
    .sort((a, b) => a.stat.accuracy - b.stat.accuracy)
    .slice(0, MAX_WEAK_SPOTS)

  const moduleTotal = questions.filter(q => q.module_id === activeModuleObj?.id).length

  // Resets the subject filter when the chosen subject has no questions in the selected stage.
  useEffect(() => {
    if (loading || !stageActive || activeSubject === 'all') return
    if (!tabSubjects.some(s => s.id === activeSubject)) onSelectSubject('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeStage, activeSubject, questions])

  const stageSimRows = stageActive ? simulatorRows.filter(r => r.stage === activeStage) : []
  const simTotal = simulatorTotal(questions, stageSimRows, activeStage, lessonStageMap)
  const simSubjectCount = stageSimRows.filter(
    r => simulatorPool(questions, r.subject_id, activeStage, lessonStageMap).length > 0
  ).length
  const stageTitle = stages.find(s => s.value === activeStage)?.title || 'Stage'

  const simulatorShown = stageActive && !loading && !simulatorLoading && simTotal > 0
  const mockHidden = stageActive && (loading || simulatorLoading || simulatorShown)

  const singleSubject = subjectRows.length === 1

  const resumeStage = resumeData?.quizConfig?.stage || resumeData?.quizConfig?.simulatorStage
  const resumeStageTitle = resumeStage && resumeData.activeModule === activeModuleObj?.id
    ? stages.find(s => s.value === resumeStage)?.title
    : undefined

  return (
    <PageShell dark={dark} backFallback="/" maxWidth={900}>
      {(loadError || modulesError) && <ErrorBanner />}
      {usingCache && (
        <OfflineNote
          dark={dark}
          alwaysShow
          message="You're offline — showing questions saved from your last visit. Quizzes still work and are saved on this device."
        />
      )}

      <PageIntro
        dark={dark}
        emoji={<ExamIcon color={mcqText} size={40} />}
        title="MCQ Bank"
        subtitle={!loading && moduleTotal > 0
          ? `${countLabel(moduleTotal)} · ${moduleSubjects.length} subject${moduleSubjects.length === 1 ? '' : 's'}`
          : undefined}
        paddingBottom={16}
      />

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <PulseGlassRow dark={dark} radius={999} hoverTint={hoverTint} onClick={() => navigate('/review')}>
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
            <div style={{ color: mcqText, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <PauseIcon color={mcqText} size={13} /> Paused {quizName(resumeData.quizMode, resumeStageTitle)} — {Object.keys(resumeData.answers || {}).length}/{(resumeData.quizQuestions || []).length} answered
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button dark={dark} variant="solid" size="sm" color={MCQ_ACCENT} onClick={onResume} style={{ padding: '6px 14px', gap: 5 }}>
                <PlayIcon color={ON_ACCENT} size={11} /> Continue
              </Button>
              <Button
                dark={dark} variant="outline" size="sm" color={mcqText} onClick={onDiscardResume}
                style={{ padding: '6px 14px', border: `1px solid ${mcqText}40` }}
              >Discard</Button>
            </div>
          </LiquidGlassCard>
        </div>
      )}

      {activeModuleObj && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          color: moduleText, fontWeight: 700, fontSize: 14
        }}>
          <ModuleIcon value={activeModuleObj.icon} size={18} color={moduleText} /> {activeModuleObj.name}
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

      {!mockHidden && (
        <div style={{ marginBottom: 32 }}>
          <ActionCard
            dark={dark}
            accent={MCQ_ACCENT}
            padding="22px 24px 20px"
            icon={<ExamIcon color={mcqText} size={28} />}
            title="Mock Exam"
            subtitle={
              <CountText dark={dark}>
                {loading ? '…' : mockBank > QUIZ_MAX_QUESTIONS
                  ? `${mockCount} of ${mockBank} per exam`
                  : countLabel(mockCount)}
              </CountText>
            }
            action={
              <Button dark={dark} variant="solid" size="md" color={MCQ_ACCENT} onClick={() => onStartQuiz('mock', null, null)} style={{ flexShrink: 0 }}>
                Start →
              </Button>
            }
          >
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
          </ActionCard>
        </div>
      )}

      {simulatorShown && (
        <div style={{ marginBottom: 32 }}>
          <SimulatorCard
            dark={dark}
            title={stageTitle}
            total={simTotal}
            subjectCount={simSubjectCount}
            onStart={() => onStartSimulator(activeStage)}
          />
        </div>
      )}

      {!loading && weakSpots.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionHeader as="h3">Weak Spots</SectionHeader>
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: '6px 16px' }}>
            {weakSpots.map(({ lesson, subject, stat }, i) => (
              <div key={lesson.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${pt.border}`
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: pt.textPrimary, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</div>
                  <div style={{ color: pt.textMuted, fontSize: 11.5, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {subject.name} · {plural(stat.answered, 'answer')}
                  </div>
                </div>
                <span style={{
                  flexShrink: 0, fontWeight: 800, fontSize: 13, color: accuracyColor(stat.accuracy, pt),
                  background: `${accuracyColor(stat.accuracy, pt)}22`, borderRadius: 999, padding: '3px 11px'
                }}>{stat.accuracy}%</span>
                <Button dark={dark} variant="solid" size="sm" color={MCQ_ACCENT} onClick={() => onStartQuiz('practice', null, lesson.id)} style={{ flexShrink: 0 }}>
                  Practice
                </Button>
              </div>
            ))}
          </LiquidGlassCard>
        </div>
      )}

      <SectionHeader as="h3">Practice by Subject</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {subjectRows.map(({ sub, count, lessonRows }, i) => (
          <SubjectAccordion
            key={sub.id}
            dark={dark}
            id={`subject-lessons-${sub.id}`}
            label={`${sub.name} lessons`}
            delay={i * 70}
            icon={<ModuleIcon value={sub.icon} size={18} color={adaptColor(sub.color || tabAccentColor, dark)} />}
            title={sub.name}
            subtitle={
              <>
                {countLabel(count)}
                {count > QUIZ_MAX_QUESTIONS && (
                  <span style={{ color: pt.faint }}> · quiz uses {QUIZ_MAX_QUESTIONS}</span>
                )}
              </>
            }
            action={
              <Button dark={dark} variant="solid" size="sm" color={MCQ_ACCENT} onClick={() => onStartQuiz('practice', sub.id, null)} style={{ flexShrink: 0 }}>
                Practice All
              </Button>
            }
            expanded={expandedSubjectId === sub.id}
            forceOpen={singleSubject}
            hasPanel={lessonRows.length > 0}
            onToggle={() => setExpandedSubjectId(prev => prev === sub.id ? null : sub.id)}
          >
            {lessonRows.map(({ lesson, count: lessonQCount }) => (
              <AccordionRow key={lesson.id} dark={dark} onClick={() => onStartQuiz('practice', null, lesson.id)}>
                <span style={{ color: pt.textPrimary, fontSize: 13, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</span>
                <span style={{ color: pt.textMuted, fontSize: 11, flexShrink: 0 }}>{countLabel(lessonQCount)}</span>
              </AccordionRow>
            ))}
          </SubjectAccordion>
        ))}
        {loading && subjectRows.length === 0 && <CardRowsSkeleton count={3} label="Loading subjects" />}
        {subjectRows.length === 0 && !loading && (
          <EmptyState
            dark={dark}
            icon={<EmptyBoxIcon color={pt.sub} size={16} />}
            message={stageActive ? 'No questions in this stage yet' : 'No subjects for this module yet'}
            style={{ padding: 24 }}
          />
        )}
      </div>

      <SourceChoiceDialog
        dark={dark}
        open={!!sourceChoice}
        allCount={sourceChoice?.allCount ?? 0}
        doctorCount={sourceChoice?.doctorCount ?? 0}
        onCancel={onCancelChoice}
        onChooseAll={onChooseAll}
        onChooseDoctors={onChooseDoctors}
      />
    </PageShell>
  )
