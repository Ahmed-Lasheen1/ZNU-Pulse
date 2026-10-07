import { getPulseTheme } from '../../premiumTheme'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import ModuleSelect from './ModuleSelect'
import { inStyle as adminInStyle, fieldLabel } from './adminStyles'
import type { AdminModule, AdminSubject, AdminLesson, AdminContext } from './adminTypes'

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
  const inStyle = { ...adminInStyle(pt, dark), marginTop: 0, marginBottom: 12 }
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
            <ModuleSelect
              modules={modules}
              value={moduleId}
              onChange={id => setContext({ moduleId: id, subjectId: '', lessonId: '' })}
              dark={dark}
            />
          </div>

          {showSubject && (
            <div>
              <label style={fieldLabel(pt)}>Subject</label>
              <select
                value={subjectId}
                onChange={e => setContext({ moduleId, subjectId: e.target.value, lessonId: '' })}
                style={inStyle}
              >
                <option value="">All Subjects</option>
                {moduleSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {showLesson && (
            <div>
              <label style={fieldLabel(pt)}>Lesson</label>
              <select
                value={lessonId}
                onChange={e => setContext({ moduleId, subjectId, lessonId: e.target.value })}
                style={inStyle}
              >
                <option value="">No specific lesson</option>
                {subjectLessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
          )}
        </div>
      </LiquidGlassCard>
    </div>
  )
}
