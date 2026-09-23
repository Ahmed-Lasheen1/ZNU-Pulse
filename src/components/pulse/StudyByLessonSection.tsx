import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { getPulseTheme, pulseType, ON_GRADIENT_TOP } from '../../premiumTheme'
import { ModuleIcon, NotesIcon, ExamIcon } from '../../lib/medicalIcons'
import { StudyByLessonIcon, BookIcon } from '../ui/tool-icons'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseGlassRow from './PulseGlassRow'

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
  subjects: AccordionSubject[]
  lessons: AccordionLesson[]
  lessonQuestionIds: Set<string>
  lessonSummaries: Record<string, AccordionSummary[]>
  onOpenSummary: (summary: AccordionSummary) => void
}

function pillBtn(color: string): CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: `${color}18`, border: `1px solid ${color}55`, color,
    borderRadius: 999, padding: '6px 12px', fontSize: 11.5, fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit'
  }
}

// Subject accordion — expands in place to lesson rows with inline
// Summary/Practice actions, replacing the old Subject/Lesson pages.
export default function StudyByLessonSection({
  dark, moduleId, subjects, lessons, lessonQuestionIds, lessonSummaries, onOpenSummary
}: StudyByLessonSectionProps) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null)
  const [openPickerLessonId, setOpenPickerLessonId] = useState<string | null>(null)
  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'

  const bySubject = subjects
    .map(sub => ({ sub, lessonsForSub: lessons.filter(l => l.subject_id === sub.id) }))
    .filter(g => g.lessonsForSub.length > 0)

  if (bySubject.length === 0) return null

  function practiceLesson(lessonId: string) {
    navigate(`/mcq?module=${moduleId}&lesson=${lessonId}`)
  }
  function practiceSubject(subjectId: string) {
    navigate(`/mcq?module=${moduleId}&subject=${subjectId}`)
  }
  function handleSummary(lessonId: string, list: AccordionSummary[]) {
    if (list.length === 1) { onOpenSummary(list[0]); return }
    setOpenPickerLessonId(prev => prev === lessonId ? null : lessonId)
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <style>{`
        .study-subject-toggle { transition: background 0.15s ease; }
        .study-subject-toggle:active { background: var(--sbl-hover); }
        @media (hover: hover) { .study-subject-toggle:hover { background: var(--sbl-hover); } }
        .study-lesson-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; flex-wrap: wrap; }
        .study-lesson-main { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 160px; }
        .study-lesson-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .study-lesson-actions { display: flex; gap: 6px; flex-shrink: 0; }
        @media (max-width: 480px) {
          .study-lesson-main { min-width: 100%; }
          .study-lesson-actions { min-width: 100%; justify-content: flex-end; }
        }
      `}</style>

      <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <StudyByLessonIcon color={ON_GRADIENT_TOP.muted} size={14} /> Study by Lesson
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bySubject.map(({ sub, lessonsForSub }) => {
          const open = openSubjectId === sub.id
          return (
            <LiquidGlassCard key={sub.id} dark={dark} delay={0} style={{ padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <button
                  type="button"
                  onClick={() => setOpenSubjectId(open ? null : sub.id)}
                  aria-expanded={open}
                  aria-controls={`subject-lessons-${sub.id}`}
                  className="study-subject-toggle"
                  style={{
                    ['--sbl-hover' as any]: hoverTint,
                    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10,
                    background: 'transparent', border: 'none', padding: 16, textAlign: 'left',
                    cursor: 'pointer', font: 'inherit', color: 'inherit'
                  }}
                >
                  {sub.icon
                    ? <ModuleIcon value={sub.icon} size={20} color={sub.color || '#34d399'} />
                    : <BookIcon color={sub.color || '#34d399'} size={20} />}
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: pt.textPrimary, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</div>
                    <div style={{ color: pt.textMuted, fontSize: 11.5, marginTop: 1 }}>{lessonsForSub.length} lesson{lessonsForSub.length === 1 ? '' : 's'}</div>
                  </span>
                  <span style={{ display: 'inline-flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }}>
                    <ChevronDown size={16} color={pt.textMuted} />
                  </span>
                </button>
                <button onClick={() => practiceSubject(sub.id)} style={{
                  background: '#e2725b', color: '#0f172a', border: 'none', padding: '0 16px',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>Practice All</button>
              </div>

              <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
                <div style={{ overflow: 'hidden' }}>
                  <div
                    id={`subject-lessons-${sub.id}`} role="region" aria-label={`${sub.name} lessons`} aria-hidden={!open}
                    style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}
                  >
                    {lessonsForSub.map(lesson => {
                      const summaries = lessonSummaries[lesson.id] || []
                      const hasQuestions = lessonQuestionIds.has(lesson.id)
                      const pickerOpen = openPickerLessonId === lesson.id
                      return (
                        <div key={lesson.id}>
                          <PulseGlassRow dark={dark} radius={12}>
                            <div className="study-lesson-row">
                              <div className="study-lesson-main">
                                {lesson.icon
                                  ? <ModuleIcon value={lesson.icon} size={16} color={pt.success} />
                                  : <NotesIcon color={pt.success} size={16} />}
                                <span className="study-lesson-title" style={{ color: pt.textPrimary, fontSize: 13, fontWeight: 600 }}>{lesson.title}</span>
                              </div>
                              <div className="study-lesson-actions">
                                {summaries.length > 0 && (
                                  <button onClick={() => handleSummary(lesson.id, summaries)} style={pillBtn(pt.success)}>
                                    <NotesIcon color={pt.success} size={12} /> Summary
                                  </button>
                                )}
                                {hasQuestions && (
                                  <button onClick={() => practiceLesson(lesson.id)} style={pillBtn('#e2725b')}>
                                    <ExamIcon color="#e2725b" size={12} /> Practice
                                  </button>
                                )}
                                {!hasQuestions && summaries.length === 0 && (
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
                  </div>
                </div>
              </div>
            </LiquidGlassCard>
          )
        })}
      </div>
    </div>
  )
}
