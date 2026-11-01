interface QuestionRailProps {
  total: number
  currentIndex: number
  answeredIndexes: Set<number>
  flaggedIndexes: Set<number>
  onGoTo: (i: number) => void
  dark: boolean
  accent: string
}

// Segmented progress rail above the focused question in MCQ's
// single-question view — one segment per question, tap to jump.
export default function QuestionRail({
  total, currentIndex, answeredIndexes, flaggedIndexes, onGoTo, dark, accent
}: QuestionRailProps) {
  return (
    <div style={{
      display: 'flex',
      // Gap shrinks on narrow viewports so up to 50 segments still fit.
      gap: 'clamp(1px, 0.6vw, 4px)',
      marginBottom: 18, alignItems: 'flex-end'
    }}>
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === currentIndex
        const isAnswered = answeredIndexes.has(i)
        const isFlagged = flaggedIndexes.has(i)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: isFlagged ? '#f59e0b' : 'transparent'
            }} />
            <button
              onClick={() => onGoTo(i)}
              aria-label={`Go to question ${i + 1}`}
              aria-current={isCurrent ? 'step' : undefined}
              style={{
                width: '100%', height: isCurrent ? 8 : 6, border: 'none', cursor: 'pointer',
                borderRadius: 999, padding: 0,
                background: isCurrent
                  ? accent
                  : isAnswered
                    ? `${accent}70`
                    : (dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)'),
                boxShadow: isCurrent ? `0 0 8px ${accent}80` : 'none',
                transition: 'all 0.2s ease'
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
