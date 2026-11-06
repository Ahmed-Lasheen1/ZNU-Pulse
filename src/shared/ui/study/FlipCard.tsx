import type { ReactNode } from 'react'

interface FlipCardProps {
  flipped: boolean
  // Called on every tap; the parent decides whether to show the answer or the question.
  onToggle: () => void
  front: ReactNode
  back: ReactNode
}

// Swaps the question and answer faces with a short crossfade, so the text never rotates or mirrors.
// The hidden face is removed from hit-testing and scrolling, so the visible face always scrolls.
export default function FlipCard({ flipped, onToggle, front, back }: FlipCardProps) {
  // Toggles between question and answer, unless the tap ended a text selection.
  function handleClick() {
    if (window.getSelection()?.toString()) return
    onToggle()
  }

  return (
    <div className="flip-scene">
      <style>{`
        .flip-inner { display: grid; border-radius: 18px; outline: none; cursor: pointer; }
        .flip-face {
          grid-area: 1 / 1; min-width: 0;
          opacity: 1; transform: none; visibility: visible;
          transition: opacity 0.25s ease, transform 0.25s ease, visibility 0s;
        }
        .flip-face[data-shown="false"] {
          opacity: 0; transform: translateY(8px) scale(0.98);
          visibility: hidden; pointer-events: none;
          transition: opacity 0.25s ease, transform 0.25s ease, visibility 0s linear 0.25s;
        }
        @media (prefers-reduced-motion: reduce) {
          .flip-face, .flip-face[data-shown="false"] { transition: none; transform: none; }
        }
      `}</style>

      <div
        className="flip-inner glass-focus-ring"
        data-flipped={flipped}
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'Answer shown — tap to see the question' : 'Show answer'}
        onClick={handleClick}
      >
        <div className="flip-face" data-shown={!flipped} aria-hidden={flipped}>{front}</div>
        <div className="flip-face" data-shown={flipped} aria-hidden={!flipped}>{back}</div>
      </div>
    </div>
  )
}
