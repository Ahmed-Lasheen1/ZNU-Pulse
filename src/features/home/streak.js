// Hour of the morning at which a new "study day" starts, so studying just after midnight still counts for the previous day.
const STUDY_DAY_START_HOUR = 4
const HOUR_MS = 60 * 60 * 1000
const ONE_DAY_MS = 24 * HOUR_MS

// Local midnight of the study day a timestamp belongs to.
function studyDay(timestamp) {
  const shifted = new Date(new Date(timestamp).getTime() - STUDY_DAY_START_HOUR * HOUR_MS)
  shifted.setHours(0, 0, 0, 0)
  return shifted
}

// Computes a "current streak" (consecutive study days with at least one quiz
// attempt or flashcard review) from a flat list of timestamps — works with
// Supabase timestamptz strings, ISO strings from saved flashcard progress,
// and plain ms-epoch numbers (guest history), since `new Date()` accepts
// all of them. A study day runs from 4 am to 4 am.
export function computeStreak(timestamps) {
  if (!timestamps || timestamps.length === 0) return 0

  const days = [...new Set(timestamps.map(t => studyDay(t).getTime()))]
    .map(ms => new Date(ms))
    .sort((a, b) => b - a)

  const today = studyDay(Date.now())

  // If the most recent activity isn't today or yesterday, the streak
  // has already been broken.
  const diffFromToday = Math.round((today - days[0]) / ONE_DAY_MS)
  if (diffFromToday > 1) return 0

  let streak = 1
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round((days[i - 1] - days[i]) / ONE_DAY_MS)
    if (diff === 1) streak++
    else break
  }
  return streak
}
