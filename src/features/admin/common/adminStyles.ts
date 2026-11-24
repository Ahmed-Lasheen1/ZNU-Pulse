import type { CSSProperties } from 'react'
import { pulseFonts } from '@/shared/theme/premiumTheme'
import { glassInput } from '@/shared/ui/glass/PulseUI'
import type { PulseTheme } from '@/shared/theme/types'

export const LIST_LIMIT = 200

// Glass input style used by every admin form field.
export function inStyle(pt: PulseTheme, dark: boolean): CSSProperties {
  return { ...glassInput(pt, dark), borderRadius: 14 }
}

// Small outlined action button used in admin rows and forms.
export function miniBtn(color: string): CSSProperties {
  return {
    background: 'transparent',
    border: `1px solid ${color}66`,
    padding: '6px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
    color,
    fontFamily: pulseFonts.body,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  }
}

// Label above an admin form field.
export function fieldLabel(pt: PulseTheme): CSSProperties {
  return { color: pt.textMuted, fontSize: 12, display: 'block', marginBottom: 4, fontWeight: 600 }
}

// Heading above a group of admin rows.
export function groupHeading(color: string): CSSProperties {
  return { color, marginBottom: 8, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }
}
