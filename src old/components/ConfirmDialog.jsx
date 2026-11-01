import { useEffect, useRef } from 'react'
import { getPulseTheme, pulseFonts, pulseType } from '../premiumTheme'
import LiquidGlassCard from './ui/liquid-glass-card'
import { WarningIcon } from './ui/tool-icons'

// Generic glass confirmation modal. Clicking the backdrop or pressing
// Escape both count as Cancel. Tab is trapped inside the dialog while open.
export default function ConfirmDialog({
  dark, open, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  confirmColor, onConfirm, onCancel
}) {
  const pt = getPulseTheme(dark)
  const cancelRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function onKeyDown(e) {
      if (e.key === 'Escape') { onCancel(); return }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    cancelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null
  const accent = confirmColor || pt.danger

  return (
    <div
      role="presentation"
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
      }}
    >
      <div
        ref={dialogRef}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        style={{ width: '100%', maxWidth: 360 }}
      >
        <LiquidGlassCard dark={dark} delay={0} instant style={{ padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: `${accent}20`, border: `1px solid ${accent}45`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <WarningIcon color={accent} size={22} />
            </div>
          </div>
          <h3 id="confirm-dialog-title" style={{ ...pulseType.sectionTitle, fontSize: 17, color: pt.textPrimary, marginBottom: 8, fontFamily: pulseFonts.display }}>
            {title}
          </h3>
          {message && (
            <p style={{ color: pt.sub, fontSize: 13, lineHeight: 1.5, marginBottom: 22, fontFamily: pulseFonts.body }}>
              {message}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button ref={cancelRef} onClick={onCancel} style={{
              flex: 1, padding: '12px', borderRadius: 999,
              background: 'transparent', border: `1px solid ${pt.border}`,
              color: pt.sub, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: pulseFonts.body
            }}>{cancelLabel}</button>
            <button onClick={onConfirm} style={{
              flex: 1, padding: '12px', borderRadius: 999,
              background: accent, border: 'none',
              color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: pulseFonts.body
            }}>{confirmLabel}</button>
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  )
}
