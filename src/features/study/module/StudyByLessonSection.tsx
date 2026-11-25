import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import { ModuleIcon, NotesIcon, ExamIcon } from '@/shared/icons/medicalIcons'
import { StudyByLessonIcon, BookIcon } from '@/shared/icons/tool-icons'
import { FlashcardIcon } from '@/shared/icons/FlashcardIcon'
import Button from '@/shared/ui/controls/Button'
import Checkbox from '@/shared/ui/controls/Checkbox'
import SectionHeader from '@/shared/ui/layout/SectionHeader'
import SubjectAccordion from '@/shared/ui/layout/SubjectAccordion'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
import { MCQ_ACCENT, FLASHCARD_ACCENT } from '@/shared/theme/accents'
import { accuracyColor } from '@/shared/utils/accuracy'
import { useDoneState } from '@/shared/hooks/useDoneState'
import { useWeakSpots } from '@/features/practice'
import { useLessonCompletion } from '@/features/study/module/useLessonCompletion'
import { fetchModuleQuestions } from '@/services/content/moduleContent'
import { WEAK_BELOW } from '@/services/history/weakSpots'

interface AccordionSubject {
  id: string
  name: string
  icon?: string | null
  color?: string | null
}
interface AccordionLesson {
  id: string
  title: string
  icon?: string | null
  subject_id: string
}
interface AccordionSummary {
  id: string
  title: string
  url: string
}

interface StudyByLessonSectionProps {
  dark: boolean
  moduleId: string
  stage?: string | null
  subjects: AccordionSubject[]
  lessons: AccordionLesson[]
  lessonQuestionIds: Set<string>
  lessonFlashcardIds: Set<string>
  lessonSummaries: Record<string, AccordionSummary[]>
  onOpenSummary: (summary: AccordionSummary) => void
}

// Storage key of the lessons a student has ticked in a module on this device.
const doneKey = (moduleId: string) => `module_lessons_done_${moduleId}`

// Subject accordion that expands to lesson rows with a done checkbox and Summary/Flashcards/Practice actions.
// Lessons tick themselves once studied (and can be unticked); struggling lessons carry an accuracy badge.
export default function StudyByLessonSection({
  dark, moduleId, stage, subjects, lessons, lessonQuestionIds, lessonFlashcardIds, lessonSummaries, onOpenSummary
}: StudyByLessonSectionProps) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null)
  const [openPickerLessonId, setOpenPickerLessonId] = useState<string | null>(null)
  const [moduleQuestions, setModuleQuestions] = useState<any[]>([])
  const lessonAccuracy = useWeakSpots(moduleQuestions)
  const completedLessons = useLessonCompletion(moduleId, lessons.map(l => l.id))
  const { isDone: isLessonDone, toggle: toggleDone } = useDoneState(doneKey(moduleId), completedLessons)
  // Accents as text/icon colors, adjusted to stay readable in the current mode (fills keep the original).
  const mcqText = adaptColor(MCQ_ACCENT, dark)
  const flashcardText = adaptColor(FLASHCARD_ACCENT, dark)
  // Letter color on the solid checked box.
  const onDone = dark ? '#08300f' : '#FFFFFF'

  // Loads the module's questions (shared cache) so answers can be matched to lessons.
  useEffect(() => {
    let ignore = false
    fetchModuleQuestions(moduleId).then(({ data }: { data: any[] | null }) => { if (!ignore && data) setModuleQuestions(data) })
    return () => { ignore = true }
  }, [moduleId])

  // Carries the selected exam stage into the MCQ page, like the simulator link does.
  const stageQuery = stage ? `&stage=${encodeURIComponent(stage)}` : ''

  const bySubject = subjects
    .map(sub => ({ sub, lessonsForSub: lessons.filter(l => l.subject_id === sub.id) }))
    .filter(g => g.lessonsForSub.length > 0)

  if (bySubject.length === 0) return null

  // Opens practice questions of one lesson.
  function practiceLesson(lessonId: string) {
    navigate(`/mcq?module=${moduleId}&lesson=${lessonId}${stageQuery}`)
  }
  // Opens practice questions of one subject.
  function practiceSubject(subjectId: string) {
    navigate(`/mcq?module=${moduleId}&subject=${subjectId}${stageQuery}`)
  }
  // Opens the flashcards study session of one lesson.
  function studyFlashcards(lessonId: string) {
    navigate(`/flashcards?module=${moduleId}&lesson=${lessonId}`)
  }
  // Opens the lesson's only summary, or toggles the picker when it has several.
  function handleSummary(lessonId: string, list: AccordionSummary[]) {
    if (list.length === 1) { onOpenSummary(list[0]); return }
    setOpenPickerLessonId(prev => prev === lessonId ? null : lessonId)
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <style>{`
        .study-lesson-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; flex-wrap: wrap; }
        .study-lesson-main { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 160px; }
        .study-lesson-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .study-lesson-badge { flex-shrink: 0; font-size: 10.5px; font-weight: 800; line-height: 1; border-radius: 999px; padding: 3px 8px; font-variant-numeric: tabular-nums; }
        .study-lesson-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .study-lesson-check { width: 28px; height: 28px; margin: -5px 0 -5px -5px; align-items: center; justify-content: center; }
        @media (max-width: 480px) {
          .study-lesson-main { min-width: 100%; }
          .study-lesson-actions { min-width: 100%; justify-content: center; flex-wrap: wrap; }
        }
      `}</style>

      <SectionHeader Icon={StudyByLessonIcon}>Study by Lesson</SectionHeader>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bySubject.map(({ sub, lessonsForSub }) => {
          const open = openSubjectId === sub.id
          const subColor = adaptColor(sub.color || '#34d399', dark)
          return (
            <SubjectAccordion
              key={sub.id}
              dark={dark}
              id={`subject-lessons-${sub.id}`}
              label={`${sub.name} lessons`}
              icon={sub.icon
                ? <ModuleIcon value={sub.icon} size={20} color={subColor} />
                : <BookIcon color={subColor} size={20} />}
              title={sub.name}
              subtitle={`${lessonsForSub.length} lesson${lessonsForSub.length === 1 ? '' : 's'}`}
              action={
                <Button dark={dark} variant="solid" size="sm" color={MCQ_ACCENT} onClick={() => practiceSubject(sub.id)} style={{ flexShrink: 0 }}>
                  Practice All
                </Button>
              }
              expanded={open}
              onToggle={() => setOpenSubjectId(open ? null : sub.id)}
            >
              {lessonsForSub.map(lesson => {
                const summaries = lessonSummaries[lesson.id] || []
                const hasQuestions = lessonQuestionIds.has(lesson.id)
                const hasFlashcards = lessonFlashcardIds.has(lesson.id)
                const pickerOpen = openPickerLessonId === lesson.id
                const stat = lessonAccuracy[lesson.id]
                const weak = hasQuestions && !!stat && stat.accuracy < WEAK_BELOW
                const weakColor = stat ? accuracyColor(stat.accuracy, pt) : pt.textMuted
                const isDone = isLessonDone(lesson.id)
                return (
                  <div key={lesson.id}>
                    <PulseGlassRow dark={dark} radius={12}>
                      <div className="study-lesson-row">
                        <div className="study-lesson-main">
                          <Checkbox
                            dark={dark}
                            checked={isDone}
                            onChange={() => toggleDone(lesson.id)}
                            label={`Mark ${lesson.title} as done`}
                            color={pt.success}
                            checkColor={onDone}
                            tabIndex={open ? 0 : -1}
                            className="study-lesson-check glass-focus-ring"
                          />
                          {lesson.icon
                            ? <ModuleIcon value={lesson.icon} size={16} color={pt.success} />
                            : <NotesIcon color={pt.success} size={16} />}
                          <span className="study-lesson-title" style={{
                            color: isDone ? pt.textMuted : pt.textPrimary, fontSize: 13, fontWeight: 600,
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}>{lesson.title}</span>
                          {weak && (
                            <span
                              className="study-lesson-badge"
                              title="Your recent accuracy in this lesson"
                              aria-label={`Accuracy ${stat.accuracy} percent, needs practice`}
                              style={{ color: weakColor, background: `${weakColor}22`, border: `1px solid ${weakColor}44` }}
                            >{stat.accuracy}%</span>
                          )}
                        </div>
                        <div className="study-lesson-actions">
                          {summaries.length > 0 && (
                            <Button dark={dark} variant="tinted" size="xs" color={pt.success} onClick={() => handleSummary(lesson.id, summaries)} style={{ gap: 5 }}>
                              <NotesIcon color={pt.success} size={12} /> Summary
                            </Button>
                          )}
                          {hasFlashcards && (
                            <Button dark={dark} variant="tinted" size="xs" color={flashcardText} onClick={() => studyFlashcards(lesson.id)} style={{ gap: 5 }}>
                              <FlashcardIcon color={flashcardText} size={12} /> Flashcards
                            </Button>
                          )}
                          {hasQuestions && (
                            <Button dark={dark} variant="tinted" size="xs" color={mcqText} onClick={() => practiceLesson(lesson.id)} style={{ gap: 5 }}>
                              <ExamIcon color={mcqText} size={12} /> Practice
                            </Button>
                          )}
                          {!hasQuestions && !hasFlashcards && summaries.length === 0 && (
                            <span style={{ color: pt.faint, fontSize: 11 }}>No content yet</span>
                          )}
                        </div>
                      </div>
                    </PulseGlassRow>
                    {pickerOpen && summaries.length > 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 4px 0 34px' }}>
                        {summaries.map(s => (
                          <button key={s.id} onClick={() => onOpenSummary(s)} style={{
                            background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer',
                            color: pt.sub, fontSize: 12, fontWeight: 600, padding: '4px 0', fontFamily: 'inherit'
                          }}>• {s.title}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </SubjectAccordion>
          )
        })}
      </div>
    </div>
  )
}
