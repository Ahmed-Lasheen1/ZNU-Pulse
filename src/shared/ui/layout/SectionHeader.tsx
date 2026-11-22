import type { ReactNode } from 'react'
import { pulseType, ON_BACKGROUND } from '@/shared/theme/premiumTheme'

interface SectionHeaderProps {
  children: ReactNode
  Icon?: (props: { color: string; size?: number }) => JSX.Element
  // Text and icon color; defaults to the muted page-text color.
  color?: string
  center?: boolean
  marginBottom?: number
  as?: 'h2' | 'h3'
}

// Uppercase section label with an optional leading icon, used above page sections.
export default function SectionHeader({
  children, Icon, color = ON_BACKGROUND.muted, center = false, marginBottom = 16, as: Tag = 'h2',
}: SectionHeaderProps) {
  return (
    <Tag style={{
      ...pulseType.sectionLabel, color, marginBottom,
      display: 'flex', alignItems: 'center', gap: 8,
      justifyContent: center ? 'center' : undefined,
    }}>
      {Icon && <Icon color={color} size={14} />}
      {children}
    </Tag>
  )
}
