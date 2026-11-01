import type { ReactNode } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import EmptyState from '@/shared/ui/feedback/EmptyState'
import { CardRowsSkeleton } from '@/shared/ui/feedback/Skeletons'
import { ModuleIcon } from '@/shared/icons/medicalIcons'
import { groupHeading, LIST_LIMIT } from '@/features/admin/common/adminStyles'
import type { AdminModule } from '@/features/admin/common/adminTypes'

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

      {loading && <CardRowsSkeleton count={3} variant="admin" label={`Loading ${noun}`} />}
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
