import { useNavigate } from 'react-router-dom'
import { getPulseTheme, pulseType, ON_GRADIENT_TOP } from '../../premiumTheme'
import { ModuleIcon } from '../../lib/medicalIcons'
import { StudyByLessonIcon, BookIcon } from '../ui/tool-icons'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import AutoGrid from '../AutoGrid'

interface Subject {
  id: string
  name: string
  icon?: string | null
  color?: string | null
}

interface StudyByLessonSectionProps {
  dark: boolean
  moduleId: string
  subjects: Subject[]
  // Appended as ?stage=<value> to each link — used by StagePage so
  // SubjectPage can narrow its lesson list to that exact stage.
  stage?: string
}

// "Study by Lesson" subject grid — shared by ModulePage and StagePage.
export default function StudyByLessonSection({ dark, moduleId, subjects, stage }: StudyByLessonSectionProps) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()

  if (subjects.length === 0) return null

  const linkFor = (subjectId: string) =>
    stage ? `/module/${moduleId}/subject/${subjectId}?stage=${stage}` : `/module/${moduleId}/subject/${subjectId}`

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <StudyByLessonIcon color={ON_GRADIENT_TOP.muted} size={14} /> Study by Lesson
      </h2>
      <AutoGrid>
        {subjects.map((sub, i) => (
          <LiquidGlassCard key={sub.id} dark={dark} delay={i * 80}
            onClick={() => navigate(linkFor(sub.id))}
            style={{ padding: 'clamp(20px, 2vw, 28px)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              {sub.icon
                ? <ModuleIcon value={sub.icon} size={38} color={sub.color || '#34d399'} />
                : <BookIcon color={sub.color || '#34d399'} size={38} />}
            </div>
            <div style={{ ...pulseType.cardTitle, fontSize: 'clamp(13px, 1.1vw, 16px)', color: pt.textPrimary }}>{sub.name}</div>
          </LiquidGlassCard>
        ))}
      </AutoGrid>
    </div>
  )
}
