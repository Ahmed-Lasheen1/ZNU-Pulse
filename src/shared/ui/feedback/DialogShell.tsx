import { useRef, type ReactNode, type RefObject } from 'react'
import { useDialogKeyboard } from '@/shared/hooks/useDialogKeyboard'
import { Z } from '@/shared/theme/tokens'

interface DialogShellProps {
  open: boolean
  onClose: () => void
  // Id of the element that holds the dialog's visible title.
  labelledBy: string
  maxWidth?: number
  zIndex?: number
  initialFocusRef?: RefObject<HTMLElement>
  children: ReactNode
}

// Modal scrim and dialog container (APG dialog pattern): backdrop click and Escape close it, Tab stays inside,
// focus returns to the opener. Callers supply the card content and the title element with id `labelledBy`.
export default function DialogShell({
  open, onClose, labelledBy, maxWidth = 360, zIndex = Z.dialog, initialFocusRef, children,
}: DialogShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useDialogKeyboard({ open, onClose, dialogRef, initialFocusRef })

  if (!open) return null

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        ref={dialogRef}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ width: '100%', maxWidth }}
      >
        {children}
      </div>
    </div>
  )
}
