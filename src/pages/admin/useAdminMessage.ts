import { useState, useCallback, useRef, useEffect } from 'react'

// Shared "show a message, then auto-dismiss it" hook — every admin
// tab (Modules, Subjects, Lessons, Files, Schedules, Questions,
// Summaries, Stages, Settings) previously hand-rolled the exact same
// two lines (a msg state + a showMsg function with a setTimeout
// clear). Centralized here so there's one place to change the
// pattern (e.g. dismiss duration) instead of nine.
//
// BUG FIX: this used to call setTimeout without ever clearing a
// previous pending one. Calling showMessage() twice in quick
// succession (e.g. a save followed immediately by another action)
// meant the FIRST timer would still fire and clear the message,
// wiping out the second, newer message before its own `duration` had
// elapsed. It also had no cleanup on unmount, so a timer could fire
// setState on an already-unmounted component. Both are fixed by
// tracking the pending timeout in a ref: any new call clears
// whatever was pending first, and the effect below clears it if the
// component unmounts before it fires.
export function useAdminMessage(duration = 3000) {
  const [message, setMessage] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const showMessage = useCallback((text: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setMessage(text)
    timeoutRef.current = setTimeout(() => setMessage(''), duration)
  }, [duration])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { message, showMessage }
}
