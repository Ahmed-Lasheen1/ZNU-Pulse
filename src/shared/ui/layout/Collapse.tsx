import type { CSSProperties, ReactNode } from 'react'

interface CollapseProps {
  open: boolean
  // Id referenced by the toggle's aria-controls.
  id: string
  // Accessible name of the region.
  label: string
  panelStyle?: CSSProperties
  children: ReactNode
}

// Height-animated collapsible region. Closed content is hidden from the tab order and screen readers
// (visibility switches after the close animation), so its buttons are never reachable while collapsed.
export default function Collapse({ open, id, label, panelStyle, children }: CollapseProps) {
  return (
    <div style={{
      display: 'grid', gridTemplateRows: open ? '1fr' : '0fr',
      visibility: open ? 'visible' : 'hidden',
      transition: 'grid-template-rows 0.25s ease, visibility 0.25s',
    }}>
      <div style={{ overflow: 'hidden' }}>
        <div id={id} role="region" aria-label={label} aria-hidden={!open} style={panelStyle}>
          {children}
        </div>
      </div>
    </div>
  )
}
