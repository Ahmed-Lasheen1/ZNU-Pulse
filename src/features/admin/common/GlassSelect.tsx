import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { getPulseTheme, pulseFonts } from '@/shared/theme/premiumTheme'
import { liquidGlassShadow, glassBorderColor } from '@/shared/theme/liquidGlass'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
import { ModuleIcon } from '@/shared/icons/medicalIcons'
import { DotIcon, CheckCircleIcon } from '@/shared/icons/tool-icons'
import type { PulseTheme } from '@/shared/theme/types'

export interface GlassSelectOption {
  id: string
  name: string
  icon?: string | null
  color?: string
  status?: 'active' | 'completed'
}

interface GlassSelectProps {
  options: GlassSelectOption[]
  value: string
  onChange: (id: string) => void
  dark: boolean
  placeholder?: string
  emptyLabel?: string
  fallbackIcon?: string
}

interface PanelRect {
  top: number
  left: number
  width: number
  maxHeight: number
}

const PANEL_MAX_HEIGHT = 320
const PANEL_MIN_HEIGHT = 140
const VIEWPORT_MARGIN = 12

export default function GlassSelect({
  options, value, onChange, dark, placeholder = 'Select', emptyLabel, fallbackIcon
}: GlassSelectProps) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<PanelRect | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pt = getPulseTheme(dark)
  const selected = options.find(o => o.id === value) || null
  const ungrouped = options.filter(o => !o.status)
  const activeOptions = options.filter(o => o.status === 'active')
  const completedOptions = options.filter(o => o.status && o.status !== 'active')

  function measure() {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const top = r.bottom + 6
    const available = window.innerHeight - top - VIEWPORT_MARGIN
    setRect({
      top, left: r.left, width: r.width,
      maxHeight: Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, available))
    })
  }

  useEffect(() => {
    if (!open) return
    measure()

    function onClickOutside(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return
      if (panelRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    function onEscape(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    function onReposition() { measure() }

    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  function pick(id: string) {
    onChange(id)
    setOpen(false)
  }

  function row(o: GlassSelectOption) {
    const active = o.id === value
    return (
      <button key={o.id} type="button" role="option" aria-selected={active} className="glass-select-option" onClick={() => pick(o.id)} style={optionRow(pt, active)}>
        <ModuleIcon value={o.icon} size={16} color={o.color || pt.cobalt} fallbackEmoji={fallbackIcon} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
      </button>
    )
  }

  const labelStyle: CSSProperties = { fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

  return (
    <div ref={triggerRef} style={{ position: 'relative', marginBottom: 12 }}>
      <PulseGlassRow
        dark={dark} radius={14} onClick={() => setOpen(o => !o)}
        role="button" tabIndex={0} aria-haspopup="listbox" aria-expanded={open}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
          {selected ? (
            <>
              <ModuleIcon value={selected.icon} size={18} color={selected.color || pt.cobalt} fallbackEmoji={fallbackIcon} />
              <span style={{ ...labelStyle, color: pt.text, fontWeight: 700 }}>{selected.name}</span>
            </>
          ) : value === '' && emptyLabel ? (
            <span style={{ ...labelStyle, color: pt.sub, fontWeight: 600 }}>{emptyLabel}</span>
          ) : (
            <span style={{ ...labelStyle, color: pt.faint }}>{placeholder}</span>
          )}
          <span aria-hidden style={{ color: pt.faint, fontSize: 11, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }}>▼</span>
        </div>
      </PulseGlassRow>

      {open && rect && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          style={{
            position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 3000,
            maxHeight: rect.maxHeight, overflowY: 'auto', borderRadius: 14,
            background: dark ? 'rgba(20,32,54,0.62)' : 'rgba(255,255,255,0.62)',
            backdropFilter: 'blur(22px) saturate(160%)', WebkitBackdropFilter: 'blur(22px) saturate(160%)',
            border: `1px solid ${glassBorderColor(dark)}`,
            boxShadow: `${liquidGlassShadow(dark)}, 0 16px 40px rgba(0,0,0,0.28)`
          }}
        >
          <style>{`
            .glass-select-option { transition: background 0.12s ease; }
            .glass-select-option:hover, .glass-select-option:focus-visible { background: ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)'}; outline: none; }
          `}</style>
          {emptyLabel && (
            <button type="button" role="option" aria-selected={value === ''} className="glass-select-option" onClick={() => pick('')} style={optionRow(pt, value === '')}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emptyLabel}</span>
            </button>
          )}
          {options.length === 0 && !emptyLabel && (
            <div style={{ padding: '14px 16px', color: pt.faint, fontSize: 13 }}>Nothing here yet</div>
          )}
          {ungrouped.map(row)}
          {activeOptions.length > 0 && <div style={groupLabel(pt)}><DotIcon color={pt.textMuted} size={8} /> Active</div>}
          {activeOptions.map(row)}
          {completedOptions.length > 0 && <div style={groupLabel(pt)}><CheckCircleIcon color={pt.textMuted} size={11} /> Completed</div>}
          {completedOptions.map(row)}
        </div>,
        document.body
      )}
    </div>
  )
}

function groupLabel(pt: PulseTheme): CSSProperties {
  return { padding: '10px 16px 4px', fontSize: 10, fontWeight: 800, letterSpacing: 1, color: pt.textMuted, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }
}

function optionRow(pt: PulseTheme, active: boolean): CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
    padding: '10px 16px', background: active ? `${pt.cobalt}22` : 'transparent', border: 'none',
    cursor: 'pointer', color: pt.text, fontSize: 13, fontWeight: 600, fontFamily: pulseFonts.body
  }
}
