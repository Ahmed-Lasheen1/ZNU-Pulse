import { useState, useEffect, useRef, type ReactNode, type KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { getPulseTheme } from '../../premiumTheme'
import { ModuleIcon } from '../../lib/medicalIcons'
import { EditIcon, GearIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '../../components/ui/tool-icons'
import { miniBtn, inStyle as adminInStyle } from './adminStyles'

interface TreeChip { label: string; color: string }

interface TreeRowProps {
  dark: boolean
  noun: string
  label: string
  icon?: string | null
  fallbackIcon: string
  color: string
  // Modules and subjects expand; lessons are leaves (expandable = false).
  expandable: boolean
  open?: boolean
  active?: boolean
  meta?: string
  badge?: string
  chips?: TreeChip[]
  extraActions?: ReactNode
  onToggle: () => void
  onRename: (name: string) => Promise<boolean>
  onDetails: () => void
  onDelete: () => void
}

const iconBtn = (color: string) => ({ ...miniBtn(color), padding: '6px 8px' })

export default function TreeRow({
  dark, noun, label, icon, fallbackIcon, color, expandable, open = false, active = false,
  meta, badge, chips, extraActions, onToggle, onRename, onDetails, onDelete
}: TreeRowProps) {
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

  async function commit() {
    const next = draft.trim()
    if (busy || !next) return
    setBusy(true)
    const ok = await onRename(next)
    setBusy(false)
    if (ok) setRenaming(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); commit() }
    else if (e.key === 'Escape') setRenaming(false)
  }

  return (
    <div
      className="st-row"
      style={{
        background: active ? `${color}22` : undefined,
        borderColor: active ? `${color}77` : 'transparent',
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
        <div className="st-row-line">
          <button
            type="button"
            className="st-row-main glass-focus-ring"
            onClick={onToggle}
            aria-expanded={expandable ? open : undefined}
            aria-pressed={expandable ? undefined : active}
          >
            {expandable ? (
              <ChevronDown
                size={16} color={pt.textMuted}
                style={{ flexShrink: 0, transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}
              />
            ) : (
              <span style={{ width: 4, flexShrink: 0 }} />
            )}
            <ModuleIcon value={icon || fallbackIcon} size={20} color={color} />
            <span style={{
              flex: 1, minWidth: 0, color: pt.text, fontWeight: expandable ? 700 : 600, fontSize: 13.5,
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

          <div className="st-row-actions">
            {extraActions}
            <button type="button" onClick={() => { setDraft(label); setRenaming(true) }} aria-label={`Rename ${noun}: ${label}`} title="Rename" style={iconBtn(pt.cobalt)}>
              <EditIcon color={pt.cobalt} size={12} />
            </button>
            <button type="button" onClick={onDetails} aria-label={`Details for ${noun}: ${label}`} title="Details" style={iconBtn(pt.sub)}>
              <GearIcon color={pt.sub} size={12} />
            </button>
            <button type="button" onClick={onDelete} aria-label={`Delete ${noun}: ${label}`} title="Delete" style={iconBtn(pt.danger)}>
              <TrashIcon color={pt.danger} size={12} />
            </button>
          </div>
        </div>
      )}

      {chips && chips.length > 0 && !renaming && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 2px 4px 34px' }}>
          {chips.map(chip => (
            <span key={chip.label} style={{
              background: `${chip.color}22`, border: `1px solid ${chip.color}55`, color: chip.color,
              borderRadius: 999, padding: '1px 8px', fontSize: 10.5, fontWeight: 700
            }}>{chip.label}</span>
          ))}
        </div>
      )}
    </div>
  )
}
