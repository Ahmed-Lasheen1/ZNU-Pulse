import { useState, useEffect, useRef, type ReactNode, type KeyboardEvent } from 'react'
import { getPulseTheme } from '../../premiumTheme'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import { ModuleIcon } from '../../lib/medicalIcons'
import { EditIcon, GearIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '../../components/ui/tool-icons'
import { miniBtn, inStyle as adminInStyle } from './adminStyles'
import type { AdminIcon } from './adminTypes'

interface StructureColumnProps {
  dark: boolean
  level: 'modules' | 'subjects' | 'lessons'
  title: string
  subtitle?: string
  Icon: AdminIcon
  count?: number
  disabledMessage?: string
  emptyMessage: string
  isEmpty: boolean
  footer?: ReactNode
  children: ReactNode
}

export function StructureColumn({
  dark, level, title, subtitle, Icon, count, disabledMessage, emptyMessage, isEmpty, footer, children
}: StructureColumnProps) {
  const pt = getPulseTheme(dark)

  return (
    <div className="st-col" data-level={level}>
      <LiquidGlassCard dark={dark} delay={0} style={{ padding: '14px 12px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px', marginBottom: 10 }}>
          <Icon color={pt.cobalt} size={16} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: pt.cobalt, fontWeight: 800, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              {title}
              {count !== undefined && !disabledMessage && (
                <span style={{ color: pt.textMuted, fontWeight: 600 }}> ({count})</span>
              )}
            </div>
            {subtitle && (
              <div style={{ color: pt.textMuted, fontSize: 11, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <div className="st-col-body">
          {disabledMessage
            ? <p style={{ color: pt.textMuted, fontSize: 12.5, padding: '10px 6px', lineHeight: 1.5 }}>{disabledMessage}</p>
            : isEmpty
              ? <p style={{ color: pt.textMuted, fontSize: 12.5, padding: '10px 6px', lineHeight: 1.5 }}>{emptyMessage}</p>
              : children}
        </div>

        {footer && !disabledMessage && <div style={{ marginTop: 10 }}>{footer}</div>}
      </LiquidGlassCard>
    </div>
  )
}

interface StructureChip {
  label: string
  color: string
}

interface StructureRowProps {
  dark: boolean
  noun: string
  label: string
  icon?: string | null
  fallbackIcon: string
  color: string
  selected: boolean
  meta?: string
  badge?: string
  chips?: StructureChip[]
  extraActions?: ReactNode
  onSelect: () => void
  onRename: (name: string) => Promise<boolean>
  onDetails: () => void
  onDelete: () => void
}

export function StructureRow({
  dark, noun, label, icon, fallbackIcon, color, selected, meta, badge, chips, extraActions,
  onSelect, onRename, onDetails, onDelete
}: StructureRowProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(label)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!renaming) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [renaming])

  useEffect(() => {
    if (!selected) setRenaming(false)
  }, [selected])

  function startRename() {
    setDraft(label)
    setRenaming(true)
  }

  async function commit() {
    if (busy) return
    const next = draft.trim()
    if (!next) return
    setBusy(true)
    const ok = await onRename(next)
    setBusy(false)
    if (ok) setRenaming(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      setRenaming(false)
    }
  }

  return (
    <div
      className="st-row"
      style={{
        background: selected ? `${color}22` : undefined,
        borderColor: selected ? `${color}77` : 'transparent',
      }}
    >
      {renaming ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            ref={inputRef}
            dir="auto"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label={`Rename ${noun}`}
            style={{ ...inStyle, marginBottom: 0, marginTop: 0, flex: 1, minWidth: 0, width: 'auto', padding: '7px 12px', fontSize: 13 }}
          />
          <button type="button" onClick={commit} disabled={busy} aria-label="Save name" style={miniBtn(pt.success)}>
            <CheckCircleIcon color={pt.success} size={13} />
          </button>
          <button type="button" onClick={() => setRenaming(false)} aria-label="Cancel rename" style={miniBtn(pt.sub)}>
            <XCircleIcon color={pt.sub} size={13} />
          </button>
        </div>
      ) : (
        <button type="button" className="st-row-main glass-focus-ring" onClick={onSelect} aria-pressed={selected}>
          <ModuleIcon value={icon || fallbackIcon} size={20} color={color} />
          <span style={{
            flex: 1, minWidth: 0, color: pt.text, fontWeight: selected ? 800 : 600, fontSize: 13.5,
            lineHeight: 1.35, wordBreak: 'break-word', overflowWrap: 'anywhere'
          }}>{label}</span>
          {meta && <span style={{ color: pt.textMuted, fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{meta}</span>}
          {badge && (
            <span style={{
              color: pt.textMuted, border: `1px solid ${pt.border}`, borderRadius: 999,
              padding: '1px 8px', fontSize: 10.5, fontWeight: 700, flexShrink: 0
            }}>{badge}</span>
          )}
        </button>
      )}

      {chips && chips.length > 0 && !renaming && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '2px 2px 2px 30px' }}>
          {chips.map(chip => (
            <span key={chip.label} style={{
              background: `${chip.color}22`, border: `1px solid ${chip.color}55`, color: chip.color,
              borderRadius: 999, padding: '1px 8px', fontSize: 10.5, fontWeight: 700
            }}>{chip.label}</span>
          ))}
        </div>
      )}

      {selected && !renaming && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 2px 2px 30px' }}>
          <button type="button" onClick={startRename} aria-label={`Rename ${noun}: ${label}`} style={miniBtn(pt.cobalt)}>
            <EditIcon color={pt.cobalt} size={12} /> Rename
          </button>
          <button type="button" onClick={onDetails} aria-label={`Details for ${noun}: ${label}`} style={miniBtn(pt.sub)}>
            <GearIcon color={pt.sub} size={12} /> Details
          </button>
          {extraActions}
          <button type="button" onClick={onDelete} aria-label={`Delete ${noun}: ${label}`} style={miniBtn(pt.danger)}>
            <TrashIcon color={pt.danger} size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}
