import type { ReactNode, CSSProperties } from 'react'
import { getPulseTheme, pulseFonts } from '@/shared/theme/premiumTheme'
import { isSuccessMessage } from '@/shared/utils/messageStyle'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
import type { PulseTheme } from '@/shared/theme/types'

// Shared shell for every full-screen auth-style page (Auth, Reset
// Password): a pill-shaped glass field, a plain text link and the
// status banner. Buttons come from shared/ui/controls/Button and
// toggles from shared/ui/controls/PillTabs.

// Pill-shaped glass field that wraps an input.
export function GlassField({ dark, children }: { dark: boolean; children: ReactNode }) {
  return (
    <PulseGlassRow dark={dark} radius={999}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 20px' }}>
        {children}
      </div>
    </PulseGlassRow>
  )
}

// Plain text button used as a link.
export function TextLink({ pt, onClick, muted, disabled, children }: {
  pt: PulseTheme; onClick?: () => void; muted?: boolean; disabled?: boolean; children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      background: 'none', border: 'none', padding: 0, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: pulseFonts.body, fontSize: 12, fontWeight: 600,
      color: muted ? pt.textMuted : pt.cobalt, opacity: disabled ? 0.6 : 1
    }}>{children}</button>
  )
}

// Success/error message banner shown at the top of an auth form. Its colors follow the color mode.
export function AuthMessage({ dark, message }: { dark: boolean; message: string }) {
  if (!message) return null
  const pt = getPulseTheme(dark)
  const isSuccess = isSuccessMessage(message)
  const status = isSuccess ? pt.success : pt.danger
  return (
    <div style={{ marginBottom: 16 }}>
      <PulseGlassRow dark={dark} radius={12} active activeTint={`${status}2E`}>
        <div style={{
          padding: '11px 16px', fontSize: 12, fontWeight: 700,
          color: status, fontFamily: pulseFonts.body,
          textAlign: 'center'
        }}>
          {message}
        </div>
      </PulseGlassRow>
    </div>
  )
}

// Shared plain-<input> reset — same box model every field in the auth
// shell needs, parameterized just enough for the OTP input's centered
// large digits.
export function inputResetStyle(pt: PulseTheme, opts: Partial<CSSProperties> = {}): CSSProperties {
  return {
    flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
    color: pt.text, fontSize: 14, fontFamily: pulseFonts.body, fontWeight: 600,
    ...opts
  }
}
