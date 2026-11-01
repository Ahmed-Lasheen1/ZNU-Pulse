// src/components/ToastProvider.jsx
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

const ToastContext = createContext(() => {})

// Lets any component call showToast('message') to pop a small
// auto-dismissing confirmation at the bottom of the screen — used for
// quick actions like flagging a question, saving profile changes, or
// adding a checklist item, where a full inline banner would be
// overkill but the student still deserves a "yep, that worked" cue.
//
// Three types:
//   'success' (default) — dark pill, a quick confirmation.
//   'error'             — red, reserved for real failures (a save or
//                         request that didn't go through).
//   'info'              — calm, compact, blue-accented. For neutral
//                         "FYI" states that aren't anyone's fault
//                         (e.g. the browser can't do push
//                         notifications) — red would read as a threat
//                         there. Stays on screen a little longer since
//                         it's usually a full sentence.
export function useToast() {
  return useContext(ToastContext)
}

const DURATIONS = { success: 2500, error: 2500, info: 6000 }

export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timeoutRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(timeoutRef.current)
    setToast({ message, type })
    timeoutRef.current = setTimeout(() => setToast(null), DURATIONS[type] ?? DURATIONS.success)
  }, [])

  // Safety net: clears any pending dismiss timer if this provider
  // itself ever unmounts mid-toast, so it can't fire setState after
  // unmount. In practice ToastProvider wraps the whole app for its
  // entire lifetime, so this rarely matters — added for completeness.
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  const isError = toast?.type === 'error'
  const isInfo = toast?.type === 'info'

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          // Errors interrupt screen readers (alert); everything else
          // is announced politely (status) so it never talks over
          // what the person is doing.
          role={isError ? 'alert' : 'status'}
          aria-live={isError ? 'assertive' : 'polite'}
          style={{
            position: 'fixed',
            // Default: 24px + env(safe-area-inset-bottom) now that index.html
            // sets viewport-fit=cover and PulseBackground bleeds under the
            // home-indicator. Pages with their own fixed bottom bar (the MCQ
            // exam bar) set --toast-bottom so the toast sits above it.
            bottom: 'var(--toast-bottom, calc(24px + env(safe-area-inset-bottom, 0px)))',
            left: '50%', transform: 'translateX(-50%)',
            background: isError ? '#ef4444' : isInfo ? 'rgba(16,36,58,0.94)' : '#1e293b',
            color: '#fff',
            padding: isInfo ? '8px 14px' : '10px 20px',
            borderRadius: isInfo ? 14 : 12,
            fontSize: isInfo ? 12.5 : 13, fontWeight: isInfo ? 600 : 700,
            lineHeight: isInfo ? 1.35 : undefined,
            zIndex: 3000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            border: `1px solid ${isError ? '#f8717140' : isInfo ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.12)'}`,
            // Without an explicit width, a fixed element pinned at left:50%
            // is only allowed to grow to the remaining 50% of the screen,
            // so text wrapped into a narrow, TALL box on phones (a
            // ~150-char message stacked into 6+ lines). max-content lets
            // it use the room it actually has, capped just under the
            // screen width.
            width: 'max-content',
            maxWidth: 'min(94vw, 420px)',
            textAlign: isInfo ? 'left' : 'center',
            display: isInfo ? 'flex' : undefined,
            alignItems: isInfo ? 'center' : undefined,
            gap: isInfo ? 8 : undefined,
            pointerEvents: 'none'
          }}
        >
          {isInfo && <Info size={15} color="#38bdf8" style={{ flexShrink: 0 }} aria-hidden />}
          <span>{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}
