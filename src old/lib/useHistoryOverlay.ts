import { useEffect, useRef } from 'react'

// Makes a full-screen overlay (SummaryOverlay, MediaOverlay, a
// module-summaries drill-down, etc.) respond to the phone's hardware
// or browser back button by closing itself instead of leaving the
// page entirely — the same expectation a native app's modal meets.
//
// How it works: the moment the overlay opens (isOpen becomes true),
// this pushes one extra same-URL history entry tagged with a marker.
// Pressing back then just pops that marker entry — which the
// `popstate` listener below turns into "close the overlay" — instead
// of leaving the page. Because the URL never actually changes,
// react-router's own location tracking is untouched by this; it only
// reacts to popstate when the resulting URL differs, which it never
// does here.
//
// The trap most hand-rolled versions of this fall into: closing the
// overlay any OTHER way (its own "✕ Close" button, tapping outside,
// a parent navigating away) without ALSO consuming that pushed entry
// leaves it dangling — the next back press pops the dead entry with
// no visible effect, and the student needs a second press to actually
// leave. This hook avoids that by handling cleanup itself: whenever
// `isOpen` flips back to false for ANY reason, the effect's cleanup
// checks whether the pushed entry was already consumed by a real back
// press; if not, it consumes it there and then. There is exactly one
// path this can ever happen through, so it can never be left behind.
export function useHistoryOverlay(isOpen: boolean, onClose: () => void) {
  const pushedRef = useRef(false)
  const closingViaPopRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    window.history.pushState({ overlay: true }, '')
    pushedRef.current = true

    function handlePopState() {
      if (!pushedRef.current) return
      pushedRef.current = false
      closingViaPopRef.current = true
      onClose()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      // isOpen is about to become false. If that happened because of
      // a real back-button press, handlePopState already ran, already
      // set pushedRef to false, and already called onClose() — this
      // branch is skipped. If it happened any other way (a close
      // button, a parent-level navigation), the pushed entry is still
      // sitting there unconsumed — pop it now so it never lingers.
      if (pushedRef.current && !closingViaPopRef.current) {
        pushedRef.current = false
        window.history.back()
      }
      closingViaPopRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])
}
