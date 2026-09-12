import { Children } from 'react'

// Responsive card grid (Home/ModulePage/StagePage/MCQ) — column count
// scales with card count; a single card renders centered/width-capped
// instead of stretching across the full row.
export default function AutoGrid({ children, style = {} }) {
  const count = Children.count(children)

  if (count === 1) {
    return (
      <div className="auto-grid-single" style={style}>
        {children}
      </div>
    )
  }

  const cols = count === 2 ? 2 : count === 3 ? 3 : 4

  return (
    <div className="auto-grid" style={{ '--auto-grid-cols': cols, ...style }}>
      {children}
    </div>
  )
}
