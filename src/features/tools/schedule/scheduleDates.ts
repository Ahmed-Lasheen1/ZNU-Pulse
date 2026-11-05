const DAY_MS = 24 * 60 * 60 * 1000

// Parses a YYYY-MM-DD string as a local calendar date.
export function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Whole days from today to the given date (negative when it is in the past).
export function daysFromToday(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseLocalDate(dateStr).getTime() - today.getTime()) / DAY_MS)
}

// Short readable date such as "Oct 22".
export function formatShortDate(dateStr: string) {
  return parseLocalDate(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Relative label such as "Today", "Tomorrow" or "In 5 days".
export function relativeDayLabel(diff: number) {
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return diff > 0 ? `In ${diff} days` : `${Math.abs(diff)} days ago`
}

// Heading for a planner day: "Today", "Tomorrow", or weekday plus date.
export function formatDayHeading(dateStr: string) {
  const diff = daysFromToday(dateStr)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return parseLocalDate(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
