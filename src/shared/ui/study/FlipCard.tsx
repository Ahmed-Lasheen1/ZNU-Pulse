import type { ReactNode } from 'react'

interface FlipCardProps {
  flipped: boolean
  onFlip: () => void
  front: ReactNode
  back: ReactNode
}

// Card that rotates in 3D to reveal its back; both faces share one grid cell.
export default function FlipCard({ flipped, onFlip, front, back }: FlipCardProps) {
  return (
    <div className="flip-scene">
      <style>{`
        .flip-scene { perspective: 1400px; }
        .flip-inner {
          display: grid; border-radius: 18px; outline: none;
          transform-style: preserve-3d;
          transition: transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1);
        }
        .flip-inner[data-flipped="true"] { transform: rotateY(180deg); }
        .flip-inner[data-flipped="false"] { cursor: pointer; }
        .flip-face { grid-area: 1 / 1; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .flip-face-back { transform: rotateY(180deg); }
        @media (prefers-reduced-motion: reduce) { .flip-inner { transition: none; } }
      `}</style>

      <div
        className="flip-inner glass-focus-ring"
        data-flipped={flipped}
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'Answer shown' : 'Show answer'}
        onClick={() => { if (!flipped) onFlip() }}
      >
        <div className="flip-face" aria-hidden={flipped}>{front}</div>
        <div className="flip-face flip-face-back" aria-hidden={!flipped}>{back}</div>
      </div>
    </div>
  )
}
