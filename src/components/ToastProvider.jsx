import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const ToastContext = createContext(() => {})

// Lets any component call showToast('message') to pop a small
// auto-dismissing confirmation at the bottom of the screen — used for
// quick actions like flagging a question, saving profile changes, or
// adding a checklist item, where a full inline banner would be
// overkill but the student still deserves a "yep, that worked" cue.
export function useToast() {
  return useContext(ToastContext)
}

export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timeoutRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(timeoutRef.current)
    setToast({ message, type })
    timeoutRef.current = setTimeout(() => setToast(null), 2500)
  }, [])

  // Safety net: clears any pending dismiss timer if this provider
  // itself ever unmounts mid-toast, so it can't fire setState after
  // unmount. In practice ToastProvider wraps the whole app for its
  // entire lifetime, so this rarely matters — added for completeness.
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#ef4444' : '#1e293b',
          color: '#fff', padding: '10px 20px', borderRadius: 12,
          fontSize: 13, fontWeight: 700, zIndex: 3000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          border: `1px solid ${toast.type === 'error' ? '#f8717140' : 'rgba(255,255,255,0.12)'}`,
          maxWidth: '90%', textAlign: 'center', pointerEvents: 'none'
        }}>
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}
