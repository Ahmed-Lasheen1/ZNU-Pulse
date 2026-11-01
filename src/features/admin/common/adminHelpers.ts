export const MODULE_DEFAULTS = { color: '#38bdf8', icon: '📚', status: 'active' } as const
export const SUBJECT_DEFAULTS = { icon: '📖', color: '#34d399', type: 'both' } as const
export const LESSON_FALLBACK_ICON = '📘'

export function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

// Color used for exam stages that no longer have a matching definition.
export const FALLBACK_STAGE_COLOR = '#64748b'
