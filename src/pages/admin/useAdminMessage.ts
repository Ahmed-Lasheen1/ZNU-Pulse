import { useState, useCallback } from 'react'

// Shared "show a message, then auto-dismiss it" hook — every admin
// tab (Modules, Subjects, Lessons, Files, Schedules, Questions,
// Summaries, Stages, Settings) previously hand-rolled the exact same
// two lines (a msg state + a showMsg function with a setTimeout
// clear). Centralized here so there's one place to change the
// pattern (e.g. dismiss duration) instead of nine.
export function useAdminMessage(duration = 3000) {
  const [message, setMessage] = useState('')

  const showMessage = useCallback((text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(''), duration)
  }, [duration])

  return { message, showMessage }
}
