import { useState } from 'react'

// Module-scoped flag — resets to false whenever this JS module itself
// re-executes, which happens on a full page load or reload, but NOT
// when React Router just swaps which component is mounted during
// client-side navigation. That's what makes the entrance animation
// replay on a fresh load/reload, but stay silent when merely
// navigating back to the page within the same session — no
// sessionStorage read/write in the render path, which was a likely
// source of the extra-render flicker.
const playedKeys = new Set()

export function useOncePerSession(key) {
  const [isFirst] = useState(() => {
    if (playedKeys.has(key)) return false
    playedKeys.add(key)
    return true
  })
  return isFirst
}
