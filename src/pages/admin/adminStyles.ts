// Shared across every admin tab — sourced entirely from the Pulse
// liquid-glass design system (premiumTheme.js).
import type { CSSProperties } from 'react'
import { getPulseTheme, pulseFonts } from '../../premiumTheme'
import { glassInput, glassPrimaryBtn, glassGhostBtn } from '../../components/pulse/PulseUI'

export type PulseTheme = ReturnType<typeof getPulseTheme>

// Cap on list queries so tabs stay fast as content grows.
export const LIST_LIMIT = 200

export function inStyle(pt: PulseTheme, dark: boolean): CSSProperties {
  return { ...glassInput(pt, dark), borderRadius: 14 }
}

export function btnStyle(pt: PulseTheme, dark: boolean): CSSProperties {
  return { ...glassPrimaryBtn(pt, dark, false), marginBottom: 0 }
}

// Primary save/add/submit button with a busy (saving/publishing)
// state — every admin tab repeated this exact opacity/cursor pairing
// on its own submit button; centralized here. `layout` lets a caller
// override the default `flex: 1` (e.g. a bulk-add button wants
// `{ width: '100%' }` instead).
export function submitBtnStyle(pt: PulseTheme, dark: boolean, busy: boolean, layout: CSSProperties = { flex: 1 }): CSSProperties {
  return {
    ...btnStyle(pt, dark),
    ...layout,
    opacity: busy ? 0.7 : 1,
    cursor: busy ? 'not-allowed' : 'pointer',
  }
}

export function miniBtn(pt: PulseTheme, color: string): CSSProperties {
  return {
    background: 'transparent', border: `1px solid ${color}66`, padding: '6px 12px',
    borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700, color,
    fontFamily: pulseFonts.body
  }
}

export function cancelBtnStyle(pt: PulseTheme, dark: boolean): CSSProperties {
  return { ...glassGhostBtn(pt, dark), width: 'auto', padding: '0 20px' }
}

export function fieldLabel(pt: PulseTheme): CSSProperties {
  return { color: pt.textMuted, fontSize: 12, display: 'block', marginBottom: 4, fontWeight: 600 }
}

// Section heading above each module's group of list rows.
export function groupHeading(color: string): CSSProperties {
  return { color, marginBottom: 8, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }
}
