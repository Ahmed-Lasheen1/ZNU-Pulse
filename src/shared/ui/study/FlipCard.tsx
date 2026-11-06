import type { ReactNode } from 'react'

interface FlipCardProps {
  flipped: boolean
  // Called on every tap; the parent decides whether to show the answer or the question.
  onToggle: () => void
  front: ReactNode
  back: ReactNode
}

// Flips the whole card in 3D; the back face is pre-rotated 180deg so its text reads correctly after the turn.
// The face turned away is also hidden from hit-testing, so the visible face always receives taps and scrolling.
export default function FlipCard({ flipped, onToggle, front, back }: FlipCardProps) {
  // Toggles between question and answer, unless the tap ended a text selection.
  function handleClick() {
    if (window.getSelection()?.toString()) return
    onToggle()
  }

  return (
    <div className="flip-scene">
      <style>{`
        .flip-scene { perspective: 1400px; }
        .flip-inner {
          display: grid; border-radius: 18px; outline: none; cursor: pointer;
          transform-style: preserve-3d; -webkit-transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
        }
        .flip-inner[data-flipped="true"] { transform: rotateY(180deg); }
        .flip-face {
          grid-area: 1 / 1; min-width: 0;
          backface-visibility: hidden; -webkit-backface-visibility: hidden;
          visibility: visible;
          transition: visibility 0s;
        }
        .flip-face-back { transform: rotateY(180deg); }
        /* Switches at the halfway point of the turn, when the card is edge-on. */
        .flip-face[data-shown="false"] {
          visibility: hidden; pointer-events: none;
          transition: visibility 0s linear 0.3s;
        }
        @media (prefers-reduced-motion: reduce) {
          .flip-inner, .flip-face, .flip-face[data-shown="false"] { transition: none; }
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
        <div className="flip-face flip-face-front" data-shown={!flipped} aria-hidden={flipped}>{front}</div>
        <div className="flip-face flip-face-back" data-shown={flipped} aria-hidden={!flipped}>{back}</div>
      </div>
    </div>
  )
}
