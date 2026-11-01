import { getPulseTheme } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import GlassSelect from '@/features/admin/common/GlassSelect'
import { fieldLabel } from '@/features/admin/common/adminStyles'
import { SUBJECT_DEFAULTS, LESSON_FALLBACK_ICON } from '@/features/admin/common/adminHelpers'
import type { AdminModule, AdminSubject, AdminLesson, AdminContext } from '@/features/admin/common/adminTypes'

interface AdminContextBarProps {
  dark: boolean
  modules: AdminModule[]
  subjects: AdminSubject[]
  lessons: AdminLesson[]
  context: AdminContext
  depth: number
}

export default function AdminContextBar({ dark, modules, subjects, lessons, context, depth }: AdminContextBarProps) {
  const pt = getPulseTheme(dark)
  const { moduleId, subjectId, lessonId, setContext } = context
  const moduleSubjects = subjects.filter(s => s.module_id === moduleId)
  const subjectLessons = lessons.filter(l => l.subject_id === subjectId)
  const showSubject = depth >= 2 && !!moduleId
  const showLesson = depth >= 3 && !!subjectId && subjectLessons.length > 0

  return (
    <div style={{ marginBottom: 20 }}>
      <style>{`
        .admin-context-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0 12px;
        }
        @media (min-width: 720px) {
          .admin-context-row { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
        }
      `}</style>
      <LiquidGlassCard dark={dark} delay={0} style={{ padding: '16px 22px 4px' }}>
        <div className="admin-context-row">
          <div>
            <label style={fieldLabel(pt)}>Module</label>
            <GlassSelect
              dark={dark}
              placeholder="Select Module"
              options={modules.map(m => ({ id: m.id, name: m.name, icon: m.icon, color: m.color, status: m.status }))}
              value={moduleId}
              onChange={id => setContext({ moduleId: id, subjectId: '', lessonId: '' })}
            />
          </div>

          {showSubject && (
            <div>
              <label style={fieldLabel(pt)}>Subject</label>
              <GlassSelect
                dark={dark}
                emptyLabel="All Subjects"
                fallbackIcon={SUBJECT_DEFAULTS.icon}
                options={moduleSubjects.map(s => ({ id: s.id, name: s.name, icon: s.icon, color: s.color || undefined }))}
                value={subjectId}
                onChange={id => setContext({ moduleId, subjectId: id, lessonId: '' })}
              />
            </div>
          )}

          {showLesson && (
            <div>
              <label style={fieldLabel(pt)}>Lesson</label>
              <GlassSelect
                dark={dark}
                emptyLabel="No specific lesson"
                fallbackIcon={LESSON_FALLBACK_ICON}
                options={subjectLessons.map(l => ({ id: l.id, name: l.title, icon: l.icon }))}
                value={lessonId}
                onChange={id => setContext({ moduleId, subjectId, lessonId: id })}
              />
            </div>
          )}
        </div>
      </LiquidGlassCard>
    </div>
  )
}
