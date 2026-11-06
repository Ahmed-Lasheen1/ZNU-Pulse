import type { ReactNode } from 'react'

interface FlipCardProps {
  flipped: boolean
  // Called on every tap; the parent decides whether to show the answer or the question.
  onToggle: () => void
  front: ReactNode
  back: ReactNode
}

// Duration of one flip in milliseconds; the face swap happens at the halfway point.
const FLIP_MS = 350

// Flips the whole card in 3D; the back face is pre-rotated 180deg so its text reads correctly after the turn.
// Taps are handled on the stationary scene (not the rotating element), so they register at every moment of the
// flip and a card can be flipped straight back mid-turn. The face turned away is hidden from hit-testing.
export default function FlipCard({ flipped, onToggle, front, back }: FlipCardProps) {
  // Toggles between question and answer, unless the tap ended a text selection.
  function handleClick() {
    if (window.getSelection()?.toString()) return
    onToggle()
  }

  return (
    <div
      className="flip-scene glass-focus-ring"
      role="button"
      tabIndex={0}
      aria-label={flipped ? 'Answer shown — tap to see the question' : 'Show answer'}
      onClick={handleClick}
    >
      <style>{`
        .flip-scene { perspective: 1400px; border-radius: 18px; outline: none; cursor: pointer; }
        .flip-inner {
          display: grid; border-radius: 18px;
          transform-style: preserve-3d; -webkit-transform-style: preserve-3d;
          transition: transform ${FLIP_MS}ms cubic-bezier(0.4, 0.2, 0.2, 1);
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
          transition: visibility 0s linear ${FLIP_MS / 2}ms;
        }
        @media (prefers-reduced-motion: reduce) {
          .flip-inner, .flip-face, .flip-face[data-shown="false"] { transition: none; }
        }
      `}</style>

      <div className="flip-inner" data-flipped={flipped}>
        <div className="flip-face flip-face-front" data-shown={!flipped} aria-hidden={flipped}>{front}</div>
        <div className="flip-face flip-face-back" data-shown={flipped} aria-hidden={!flipped}>{back}</div>
      </div>
    </div>
  )
}
