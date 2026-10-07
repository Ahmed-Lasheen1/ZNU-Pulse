import type { ReactNode } from 'react'
import { getPulseTheme } from '../../premiumTheme'
import ErrorBanner from '../../components/ErrorBanner'
import EmptyState from '../../components/pulse/EmptyState'
import { ModuleIcon } from '../../lib/medicalIcons'
import { groupHeading, LIST_LIMIT } from './adminStyles'
import type { AdminModule } from './adminTypes'

interface AdminGroupedListProps<T> {
  dark: boolean
  modules: AdminModule[]
  items: T[]
  moduleOf: (item: T) => string
  renderItem: (item: T) => ReactNode
  loading: boolean
  error: boolean
  noun: string
  emptyMessage: ReactNode
  limitNote?: string
}

export default function AdminGroupedList<T>({
  dark, modules, items, moduleOf, renderItem, loading, error, noun, emptyMessage, limitNote
}: AdminGroupedListProps<T>) {
  const pt = getPulseTheme(dark)

  return (
    <div>
      {error && <ErrorBanner message={`Couldn't load ${noun} — check your connection.`} />}

      {items.length === LIST_LIMIT && (
        <p style={{ color: pt.textMuted, fontSize: 11, marginBottom: 12 }}>
          {limitNote ?? `Showing the most recent ${LIST_LIMIT} — older ${noun} aren't listed here.`}
        </p>
      )}

      {loading && <EmptyState dark={dark} message="Loading..." />}
      {!loading && items.length === 0 && <EmptyState dark={dark} message={emptyMessage} />}

      {!loading && modules.map(mod => {
        const group = items.filter(item => moduleOf(item) === mod.id)
        if (group.length === 0) return null
        return (
          <div key={mod.id} style={{ marginBottom: 20 }}>
            <h4 style={groupHeading(mod.color)}>
              <ModuleIcon value={mod.icon} size={18} color={mod.color} /> {mod.name}
              <span style={{ color: pt.textMuted, fontSize: 12, fontWeight: 400 }}>({group.length})</span>
            </h4>
            <div className="admin-list-grid">{group.map(renderItem)}</div>
          </div>
        )
      })}
    </div>
  )
}
