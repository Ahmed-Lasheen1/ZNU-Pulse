import { useRef } from 'react'
import { getPulseTheme, pulseFonts, pulseType } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import DialogShell from '@/shared/ui/feedback/DialogShell'
import { WarningIcon } from '@/shared/icons/tool-icons'

// Generic glass confirmation modal. Clicking the backdrop or pressing
// Escape both count as Cancel. Tab is trapped inside the dialog while open.
export default function ConfirmDialog({
  dark, open, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  confirmColor, onConfirm, onCancel
}) {
  const pt = getPulseTheme(dark)
  const cancelRef = useRef(null)
  const accent = confirmColor || pt.danger

  return (
    <DialogShell open={open} onClose={onCancel} labelledBy="confirm-dialog-title" maxWidth={360} initialFocusRef={cancelRef}>
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
    </DialogShell>
  )
}
