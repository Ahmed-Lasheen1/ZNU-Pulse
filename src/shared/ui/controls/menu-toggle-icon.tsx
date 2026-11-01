// src/components/ui/menu-toggle-icon.tsx
import type { ComponentProps, CSSProperties } from 'react'

type MenuToggleProps = ComponentProps<'svg'> & {
  open: boolean
  duration?: number
}

// Hamburger ↔ X morph icon used by NavMenu's toggle button. Converted
// from Tailwind utility classes to inline styles/CSS transitions — same
// geometry, same dasharray/dashoffset morph, same rotation, no visual
// change.
export function MenuToggleIcon({
  open,
  style,
  fill = 'none',
  stroke = 'currentColor',
  strokeWidth = 2.5,
  strokeLinecap = 'round',
  strokeLinejoin = 'round',
  duration = 500,
  ...props
}: MenuToggleProps) {
  const rootStyle: CSSProperties = {
    transition: `transform ${duration}ms ease-in-out`,
    transform: open ? 'rotate(-45deg)' : 'none',
    ...style,
  }

  const pathStyle: CSSProperties = {
    transition: `stroke-dasharray ${duration}ms ease-in-out, stroke-dashoffset ${duration}ms ease-in-out`,
    strokeDasharray: open ? '20 300' : '12 63',
    strokeDashoffset: open ? -32.42 : 0,
  }

  return (
    <svg
      strokeWidth={strokeWidth}
      fill={fill}
      stroke={stroke}
      viewBox="0 0 32 32"
      strokeLinecap={strokeLinecap}
      strokeLinejoin={strokeLinejoin}
      style={rootStyle}
      {...props}
    >
      <path
        style={pathStyle}
        d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
      />
      <path d="M7 16 27 16" />
    </svg>
  )
}
