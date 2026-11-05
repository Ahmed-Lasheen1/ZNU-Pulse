import type { CSSProperties } from 'react'

interface ProgressRailProps {
  total: number
  currentIndex: number
  doneIndexes: Set<number>
  flaggedIndexes?: Set<number>
  onGoTo?: (i: number) => void
  dark: boolean
  accent: string
}

// Segmented progress rail; tappable when onGoTo is given, display-only otherwise.
export default function ProgressRail({
  total, currentIndex, doneIndexes, flaggedIndexes, onGoTo, dark, accent
}: ProgressRailProps) {
  const interactive = !!onGoTo

  return (
    <div
      role={interactive ? undefined : 'progressbar'}
      aria-valuemin={interactive ? undefined : 0}
      aria-valuemax={interactive ? undefined : total}
      aria-valuenow={interactive ? undefined : doneIndexes.size}
      style={{
        display: 'flex',
        // Gap shrinks on narrow viewports so up to 50 segments still fit.
        gap: 'clamp(1px, 0.6vw, 4px)',
        marginBottom: 18, alignItems: 'flex-end'
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === currentIndex
        const isDone = doneIndexes.has(i)
        const segment: CSSProperties = {
          width: '100%', height: isCurrent ? 8 : 6, borderRadius: 999,
          background: isCurrent
            ? accent
            : isDone
              ? `${accent}70`
              : (dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)'),
          boxShadow: isCurrent ? `0 0 8px ${accent}80` : 'none',
          transition: 'all 0.2s ease'
        }
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
            {flaggedIndexes && (
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: flaggedIndexes.has(i) ? '#f59e0b' : 'transparent'
              }} />
            )}
            {onGoTo ? (
              <button
                onClick={() => onGoTo(i)}
                aria-label={`Go to question ${i + 1}`}
                aria-current={isCurrent ? 'step' : undefined}
                style={{ ...segment, border: 'none', cursor: 'pointer', padding: 0 }}
              />
            ) : (
              <div style={segment} />
            )}
          </div>
        )
      })}
    </div>
  )
}
