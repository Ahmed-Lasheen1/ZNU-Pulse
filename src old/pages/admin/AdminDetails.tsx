import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { getPulseTheme, pulseFonts } from '../../premiumTheme'

interface AdminDetailsProps {
  dark: boolean
  title: string
  summary?: string
  children: ReactNode
}

export default function AdminDetails({ dark, title, summary, children }: AdminDetailsProps) {
  const pt = getPulseTheme(dark)
  const [open, setOpen] = useState(false)

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: pt.sub, fontFamily: pulseFonts.body, fontSize: 12, fontWeight: 700
        }}
      >
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
        {title}
        {summary && <span style={{ color: pt.textMuted, fontWeight: 600 }}>· {summary}</span>}
      </button>
      {open && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  )
}
