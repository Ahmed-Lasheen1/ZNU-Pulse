import { RobotIcon, BookIcon, GraduationCapIcon } from '@/shared/icons/tool-icons'

const SOURCE_META = {
  ai: { label: 'AI', Icon: RobotIcon, color: '#a78bfa' },
  courses: { label: 'Courses', Icon: BookIcon, color: '#38bdf8' },
  university: { label: 'University Doctors', Icon: GraduationCapIcon, color: '#22c55e' },
}

export default function QuestionSourceBadge({ source, dark = true }) {
  const meta = SOURCE_META[source]
  if (!meta) return null
  const { Icon } = meta

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)'}`,
      color: dark ? '#f1f5f9' : '#10243A',
      borderRadius: 20, padding: '3px 10px',
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap'
    }}>
      <Icon color={meta.color} size={12} /> {meta.label}
    </span>
  )
}
