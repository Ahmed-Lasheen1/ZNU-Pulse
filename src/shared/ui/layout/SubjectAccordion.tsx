import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import { glassHoverTint } from '@/shared/theme/liquidGlass'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import Collapse from '@/shared/ui/layout/Collapse'

interface SubjectAccordionProps {
  dark: boolean
  // Id of the collapsible panel (referenced by the toggle's aria-controls).
  id: string
  // Accessible name of the panel region.
  label: string
  delay?: number
  icon: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  // Button shown at the right of the header (for example "Practice All").
  action: ReactNode
  // True when the header toggles the panel; false renders a plain, non-interactive header.
  expandable: boolean
  open: boolean
  onToggle: () => void
  // False when there is nothing to expand, so no panel is rendered at all.
  hasPanel?: boolean
  // Rows shown inside the panel.
  children?: ReactNode
}

// Subject card whose header expands in place to a list of lesson rows (shared by MCQ, Flashcards and Study by Lesson).
export default function SubjectAccordion({
  dark, id, label, delay = 0, icon, title, subtitle, action, expandable, open, onToggle, hasPanel = true, children,
}: SubjectAccordionProps) {
  const pt = getPulseTheme(dark)
  const hoverTint = glassHoverTint(dark)

  return (
    <LiquidGlassCard dark={dark} delay={delay} style={{ padding: 0 }}>
      <style>{`
        .subject-accordion-toggle { transition: background 0.15s ease; }
        .subject-accordion-toggle:active { background: var(--sa-hover); }
        @media (hover: hover) { .subject-accordion-toggle:hover { background: var(--sa-hover); } }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
        <button
          type="button"
          onClick={expandable ? onToggle : undefined}
          aria-expanded={expandable ? open : undefined}
          aria-controls={expandable ? id : undefined}
          disabled={!expandable}
          className="subject-accordion-toggle"
          style={{
            ['--sa-hover' as any]: expandable ? hoverTint : 'transparent',
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent', border: 'none', padding: 0, textAlign: 'left',
            cursor: expandable ? 'pointer' : 'default', font: 'inherit', color: 'inherit',
          }}
        >
          {icon}
          <span style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: pt.textPrimary, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
            {subtitle && <div style={{ color: pt.textMuted, fontSize: 11.5, marginTop: 1 }}>{subtitle}</div>}
          </span>
          {expandable && (
            <span style={{ display: 'inline-flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }}>
              <ChevronDown size={16} color={pt.textMuted} />
            </span>
          )}
        </button>
        {action}
      </div>

      {hasPanel && (
        <Collapse
          open={open} id={id} label={label}
          panelStyle={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          {children}
        </Collapse>
      )}
    </LiquidGlassCard>
  )
}
