import { useEffect, useRef } from 'react'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Closes an open modal on Escape, keeps Tab focus inside it, and focuses one element when it opens.
// The latest onClose is read through a ref, so a new callback on every render never re-runs the effect or steals focus.
export function useDialogKeyboard({ open, onClose, dialogRef, initialFocusRef }) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    // Closes on Escape and wraps Tab between the first and last focusable elements.
    function onKeyDown(e) {
      if (e.key === 'Escape') { onCloseRef.current(); return }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll(FOCUSABLE)
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
    initialFocusRef?.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, dialogRef, initialFocusRef])
}
