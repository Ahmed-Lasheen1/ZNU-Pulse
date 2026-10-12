export const MODULE_DEFAULTS = { color: '#38bdf8', icon: '📚', status: 'active' } as const
export const SUBJECT_DEFAULTS = { icon: '📖', color: '#34d399', type: 'both' } as const
export const LESSON_FALLBACK_ICON = '📘'

export function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function freshNames(names: string[], taken: Set<string>) {
  const seen = new Set(taken)
  return names
    .map(name => name.trim())
    .filter(name => {
      const key = normalizeName(name)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
}
