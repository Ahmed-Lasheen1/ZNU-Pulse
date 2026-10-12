import { useState, type CSSProperties } from 'react'
import { MEDICAL_ICONS } from '../../lib/medicalIcons'
import { SearchIcon2 } from '../ui/tool-icons'
import type { PulseTheme } from '../../pages/admin/adminStyles'

interface IconPickerProps {
  value: string
  onChange: (value: string) => void
  inStyle: CSSProperties
  pt: PulseTheme
}

export default function IconPicker({ value, onChange, inStyle, pt }: IconPickerProps) {
  const [query, setQuery] = useState('')
  const selectedKey = value && value.startsWith('icon:') ? value.slice(5) : null
  const term = query.toLowerCase()

  const entries = Object.entries(MEDICAL_ICONS).filter(([key, { label }]) =>
    !term || label.toLowerCase().includes(term) || key.includes(term)
  )

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ color: pt.textMuted, fontSize: 12, display: 'block', marginBottom: 4, fontWeight: 600 }}>Icon</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input
          placeholder="Emoji, or pick below"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...inStyle, marginBottom: 0 }}
        />
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <SearchIcon2 color={pt.textMuted} size={13} />
          </span>
          <input
            placeholder="Search icons..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ ...inStyle, marginBottom: 0, paddingLeft: 32 }}
          />
        </div>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 6,
        background: pt.surfaceFlat, border: `1px solid ${pt.border}`, borderRadius: 10,
        padding: 8, maxHeight: 132, overflowY: 'auto'
      }}>
        {entries.map(([key, { label, Icon }]) => {
          const active = selectedKey === key
          return (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => onChange(`icon:${key}`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 8, cursor: 'pointer',
                background: active ? `${pt.cobalt}30` : 'transparent',
                border: `1.5px solid ${active ? pt.cobalt : pt.border}`
              }}
            >
              <Icon color={active ? pt.cobalt : pt.sub} size={18} />
            </button>
          )
        })}
        {entries.length === 0 && (
          <div style={{ gridColumn: '1 / -1', color: pt.sub, fontSize: 12, textAlign: 'center', padding: 8 }}>
            No icons match "{query}"
          </div>
        )}
      </div>
    </div>
  )
}
