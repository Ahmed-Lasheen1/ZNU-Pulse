import { useState, useCallback, useRef, useEffect } from 'react'

// Shows a message and clears it automatically after `duration` ms (used by the admin tabs and Pulse Check).
// A new message cancels the previous timer, so an older timer can never wipe a newer message early,
// and the pending timer is cleared if the component unmounts first.
export function useTimedMessage(duration = 3000) {
  const [message, setMessage] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Displays a message and schedules its removal.
  const showMessage = useCallback((text: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setMessage(text)
    timeoutRef.current = setTimeout(() => setMessage(''), duration)
  }, [duration])

  // Clears any pending timer on unmount.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { message, showMessage }
}
