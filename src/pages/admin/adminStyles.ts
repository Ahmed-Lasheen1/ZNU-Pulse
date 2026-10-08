import type { CSSProperties } from 'react'
import { getPulseTheme, pulseFonts } from '../../premiumTheme'
import { glassInput, glassPrimaryBtn, glassGhostBtn } from '../../components/pulse/PulseUI'

export type PulseTheme = ReturnType<typeof getPulseTheme>

export const LIST_LIMIT = 200

export function inStyle(pt: PulseTheme, dark: boolean): CSSProperties {
  return { ...glassInput(pt, dark), borderRadius: 14 }
}

export function submitBtnStyle(pt: PulseTheme, dark: boolean, busy: boolean, layout: CSSProperties = { flex: 1 }): CSSProperties {
  return {
    ...glassPrimaryBtn(pt, dark, false),
    marginBottom: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    ...layout,
    opacity: busy ? 0.7 : 1,
    cursor: busy ? 'not-allowed' : 'pointer',
  }
}

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

export function cancelBtnStyle(pt: PulseTheme, dark: boolean): CSSProperties {
  return { ...glassGhostBtn(pt, dark), width: 'auto', padding: '0 20px' }
}

export function fieldLabel(pt: PulseTheme): CSSProperties {
  return { color: pt.textMuted, fontSize: 12, display: 'block', marginBottom: 4, fontWeight: 600 }
}

export function groupHeading(color: string): CSSProperties {
  return { color, marginBottom: 8, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }
}
