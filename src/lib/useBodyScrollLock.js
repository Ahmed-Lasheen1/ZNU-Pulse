// src/lib/useBodyScrollLock.js
import { useEffect } from 'react'

// Prevents the real page behind a full-screen fixed overlay
// (SummaryOverlay, MediaOverlay) from being scrollable while it's
// open. The overlay's own position:fixed removes it from document
// flow, so the underlying page's real Footer collapses to sit right
// under the header — without this lock it's still reachable via
// scroll/rubber-banding behind the fixed overlay, which is what
// shows up as a "funky" floating footer.
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [active])
}
