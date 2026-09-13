import type { CSSProperties } from 'react'

interface FilterableModule {
  id: string
  name: string
}

interface AdminModuleFilterSelectProps {
  modules: FilterableModule[]
  value: string
  onChange: (value: string) => void
  totalCount: number
  inStyle: CSSProperties
}

// Shared "All modules (N)" filter dropdown shown above every admin
// tab's list — was hand-copied identically into six separate tab files.
export default function AdminModuleFilterSelect({ modules, value, onChange, totalCount, inStyle }: AdminModuleFilterSelectProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inStyle, width: 'auto', marginBottom: 0 }}>
        <option value="all">All modules ({totalCount})</option>
        {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </div>
  )
}
