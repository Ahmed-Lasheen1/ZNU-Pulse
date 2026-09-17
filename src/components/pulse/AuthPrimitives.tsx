// src/components/pulse/AuthPrimitives.tsx
import type { ReactNode, CSSProperties } from 'react'
import { getPulseTheme, pulseFonts } from '../../premiumTheme'
import { isSuccessMessage } from '../../lib/messageStyle'
import PulseGlassRow from './PulseGlassRow'

type PulseTheme = ReturnType<typeof getPulseTheme>

// Shared shell for every full-screen auth-style page (Auth, Reset
// Password): a pill-shaped glass field, a solid gradient primary
// button, a glass ghost button, and a plain text link.

export function GlassField({ dark, children }: { dark: boolean; children: ReactNode }) {
  return (
    <PulseGlassRow dark={dark} radius={999}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 20px' }}>
        {children}
      </div>
    </PulseGlassRow>
  )
}

export function PrimaryButton({ pt, disabled, onClick, children }: {
  pt: PulseTheme; disabled?: boolean; onClick?: () => void; children: ReactNode
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '15px', borderRadius: 999, border: 'none',
      background: disabled ? 'rgba(255,255,255,0.15)' : `linear-gradient(135deg, ${pt.cobalt}cc, ${pt.indigo}cc)`,
      color: disabled ? pt.sub : '#fff', fontWeight: 800, fontSize: 14, fontFamily: pulseFonts.body,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : `0 8px 28px ${pt.cobalt}35`
    }}>{children}</button>
  )
}

export function GhostButton({ dark, onClick, disabled, children }: {
  dark: boolean; onClick?: () => void; disabled?: boolean; children: ReactNode
}) {
  const pt = getPulseTheme(dark)
  const handleClick = disabled ? undefined : onClick
  return (
    <PulseGlassRow
      dark={dark} radius={999} onClick={handleClick}
      role={handleClick ? 'button' : undefined}
      tabIndex={handleClick ? 0 : undefined}
      onKeyDown={handleClick ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }) : undefined}
      style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
    >
      <div style={{ padding: '11px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: pt.text, fontFamily: pulseFonts.body }}>
        {children}
      </div>
    </PulseGlassRow>
  )
}

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

export function AccountToggle({ dark, pt, active, onClick, children }: {
  dark: boolean; pt: PulseTheme; active: boolean; onClick: () => void; children: ReactNode
}) {
  return (
    <PulseGlassRow
      dark={dark} radius={999} active={active} activeTint={`${pt.cobalt}26`}
      onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      style={{ flex: 1 }}
    >
      <div style={{
        padding: '9px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 700,
        color: active ? pt.cobalt : pt.sub, fontFamily: pulseFonts.body
      }}>{children}</div>
    </PulseGlassRow>
  )
}

// Success/error message banner shown at the top of an auth form.
export function AuthMessage({ dark, message }: { dark: boolean; message: string }) {
  if (!message) return null
  const isSuccess = isSuccessMessage(message)
  const tint = isSuccess ? 'rgba(74,222,128,0.18)' : 'rgba(239,107,87,0.18)'
  return (
    <div style={{ marginBottom: 16 }}>
      <PulseGlassRow dark={dark} radius={12} active activeTint={tint}>
        <div style={{
          padding: '11px 16px', fontSize: 12, fontWeight: 700,
          color: isSuccess ? '#4ade80' : '#EF6B57', fontFamily: pulseFonts.body,
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
