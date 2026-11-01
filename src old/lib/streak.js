// Computes a "current streak" (consecutive days with at least one quiz
// attempt) from a flat list of timestamps — works with both Supabase
// timestamptz strings (signed-in users) and plain ms-epoch numbers
// (guest history), since `new Date()` accepts either.
export function computeStreak(timestamps) {
  if (!timestamps || timestamps.length === 0) return 0

  const days = [...new Set(timestamps.map(t => new Date(t).toDateString()))]
    .map(d => new Date(d))
    .sort((a, b) => b - a)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const oneDay = 24 * 60 * 60 * 1000

  // If the most recent activity isn't today or yesterday, the streak
  // has already been broken.
  const diffFromToday = Math.round((today - days[0]) / oneDay)
  if (diffFromToday > 1) return 0

  let streak = 1
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round((days[i - 1] - days[i]) / oneDay)
    if (diff === 1) streak++
    else break
  }
  return streak
}
