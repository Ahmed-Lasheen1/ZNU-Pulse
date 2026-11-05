import { CalendarDotIcon } from '@/shared/icons/tool-icons'
import { pulseType } from '@/shared/theme/premiumTheme'
import { formatDate } from '@/shared/utils/format'

// Small calendar icon with a formatted date; renders nothing without a valid date.
export default function DateStamp({ value, color }: { value?: string | number | null; color: string }) {
  const label = value ? formatDate(value) : ''
  if (!label) return null
  return (
    <span style={{ ...pulseType.small, color, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
      <CalendarDotIcon color={color} size={12} />
      {label}
    </span>
  )
}
