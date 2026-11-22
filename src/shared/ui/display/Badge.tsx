import type { ReactNode } from 'react'
import { ON_ACCENT, RADIUS } from '@/shared/theme/tokens'

interface BadgeProps {
  // Accent color. For text on glass cards pass a color run through adaptColor.
  color: string
  // tint: soft fill; outline: tint plus a border; solid: filled with dark ink text.
  variant?: 'tint' | 'outline' | 'solid'
  size?: 'sm' | 'md'
  icon?: ReactNode
  children: ReactNode
}

// Small rounded label for statuses, counts and tags.
export default function Badge({ color, variant = 'tint', size = 'md', icon, children }: BadgeProps) {
  const small = size === 'sm'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
      padding: small ? '2px 9px' : '3px 11px',
      fontSize: small ? 10.5 : 11.5, fontWeight: 700, borderRadius: RADIUS.pill,
      background: variant === 'solid' ? color : `${color}22`,
      color: variant === 'solid' ? ON_ACCENT : color,
      border: variant === 'outline' ? `1px solid ${color}55` : 'none',
    }}>
      {icon}
      {children}
    </span>
  )
}
