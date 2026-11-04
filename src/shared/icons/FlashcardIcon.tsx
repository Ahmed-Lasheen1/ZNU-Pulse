interface IconProps {
  color: string
  size?: number
}

// Flashcard glyph: two stacked cards with text lines on the front one.
export function FlashcardIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="14" height="11" rx="2.5" stroke={color} strokeWidth="1.6" opacity="0.5" />
      <rect x="7" y="4.5" width="14" height="11" rx="2.5" stroke={color} strokeWidth="1.6" />
      <path d="M10.5 9h7M10.5 11.8h4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
