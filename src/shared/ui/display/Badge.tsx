import type { ReactNode } from 'react'
import { ON_ACCENT, RADIUS } from '@/shared/theme/tokens'

interface BadgeProps {
  // Accent color. For text on glass cards pass a color run through adaptColor. The neutral variant ignores it.
  color: string
  // tint: soft fill; outline: tint plus a border; solid: filled with dark ink text; neutral: plain pill that reads on light and dark glass.
  variant?: 'tint' | 'outline' | 'solid' | 'neutral'
  size?: 'sm' | 'md'
  // Needed by the neutral variant only.
  dark?: boolean
  // Color of a small leading dot (used by neutral tags such as subject and lesson names).
  dot?: string
  icon?: ReactNode
  children: ReactNode
}

// Small rounded label for statuses, counts and tags.
export default function Badge({ color, variant = 'tint', size = 'md', dark = true, dot, icon, children }: BadgeProps) {
  const small = size === 'sm'
  const neutral = variant === 'neutral'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
      padding: small ? '2px 9px' : '3px 11px',
      fontSize: small ? 10.5 : 11.5, fontWeight: 700, borderRadius: RADIUS.pill,
      background: neutral
        ? (dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)')
        : variant === 'solid' ? color : `${color}22`,
      color: neutral ? (dark ? '#f1f5f9' : '#10243A') : variant === 'solid' ? ON_ACCENT : color,
      border: neutral
        ? `1px solid ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)'}`
        : variant === 'outline' ? `1px solid ${color}55` : 'none',
    }}>
      {dot && <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
      {icon}
      {children}
    </span>
  )
}
