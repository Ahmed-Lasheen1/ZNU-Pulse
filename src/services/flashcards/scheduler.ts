import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from 'ts-fsrs'

export type Answer = 'again' | 'good'

// Progress of one card as saved on the device and on the server.
export interface StoredProgress {
  due: string
  last_review: string
  card: Record<string, any>
}

// Saved progress keyed by card id.
export type ProgressMap = Record<string, StoredProgress>

// Most cards a single study session contains.
export const SESSION_SIZE = 20

// Most cards a "review anyway" practice session contains.
export const PRACTICE_SIZE = 50

// Short-term steps are off: with only Again/Good buttons, "Got it" should schedule a real day-based interval.
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: false }))

// Creates the scheduler state of a card that was never studied.
export function emptyCard(now: Date): Card {
  return createEmptyCard(now)
}

// Returns the card's next state after an answer ("again" or "good").
export function reviewCard(card: Card, answer: Answer, now: Date): Card {
  return scheduler.next(card, now, answer === 'good' ? Rating.Good : Rating.Again).card
}

// Converts a scheduler card into the plain object kept on the device and server.
export function toStored(card: Card, reviewedAt: Date): StoredProgress {
  return {
    due: card.due.toISOString(),
    last_review: reviewedAt.toISOString(),
    card: JSON.parse(JSON.stringify(card)),
  }
}

// Rebuilds a scheduler card (with real dates) from saved progress.
export function fromStored(progress: StoredProgress): Card {
  const raw = progress.card
  return {
    ...raw,
    due: new Date(raw.due),
    last_review: raw.last_review ? new Date(raw.last_review) : undefined,
  } as Card
}

// True when a studied card is scheduled for now or earlier.
export function isDue(progress: StoredProgress, now: Date) {
  return Date.parse(progress.due) <= now.getTime()
}

// Merges two progress maps, keeping the more recent review of each card.
export function newerProgress(a: ProgressMap, b: ProgressMap): ProgressMap {
  const merged: ProgressMap = { ...a }
  for (const [id, entry] of Object.entries(b)) {
    const current = merged[id]
    if (!current || Date.parse(entry.last_review) > Date.parse(current.last_review)) merged[id] = entry
  }
  return merged
}

// Picks the cards for one session: due cards first (oldest due first), then at most `newLimit` never-studied cards (0 = due cards only).
export function buildSession<T extends { id: string }>(
  cards: T[], progress: ProgressMap, now: Date, size = SESSION_SIZE, newLimit = Infinity
): T[] {
  const due = cards
    .filter(card => progress[card.id] && isDue(progress[card.id], now))
    .sort((a, b) => Date.parse(progress[a.id].due) - Date.parse(progress[b.id].due))
  const fresh = cards.filter(card => !progress[card.id]).slice(0, Math.max(0, newLimit))
  return [...due, ...fresh].slice(0, size)
}

// Picks a random set of cards for "review anyway" practice, ignoring the schedule.
export function buildPracticeSession<T>(cards: T[], size = PRACTICE_SIZE): T[] {
  const pool = [...cards]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, size)
}
