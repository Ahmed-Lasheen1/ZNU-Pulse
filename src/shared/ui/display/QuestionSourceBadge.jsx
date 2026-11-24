import Badge from '@/shared/ui/display/Badge'
import { RobotIcon, BookIcon, GraduationCapIcon } from '@/shared/icons/tool-icons'

const SOURCE_META = {
  ai: { label: 'AI', Icon: RobotIcon, color: '#a78bfa' },
  courses: { label: 'Courses', Icon: BookIcon, color: '#38bdf8' },
  university: { label: 'University Doctors', Icon: GraduationCapIcon, color: '#22c55e' },
}

// Badge telling where a question comes from (AI, courses or University Doctors); renders nothing for unknown sources.
export default function QuestionSourceBadge({ source, dark = true }) {
  const meta = SOURCE_META[source]
  if (!meta) return null
  const { Icon } = meta

  return (
    <Badge variant="neutral" dark={dark} color={meta.color} icon={<Icon color={meta.color} size={12} />}>
      {meta.label}
    </Badge>
  )
}
