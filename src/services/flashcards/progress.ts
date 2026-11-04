import { supabase } from '@/core/supabase'
import { fetchAllRows } from '@/core/fetchAllRows'
import { idbGet, idbSet } from '@/core/idb'
import type { ProgressMap } from '@/services/flashcards/scheduler'

// Saved progress of one module plus the ids of cards not yet uploaded.
interface Store {
  cards: ProgressMap
  dirty: string[]
}

const BATCH_SIZE = 500

// Signed-in data lives under "user:" so sign-out clears it with the other per-user caches.
const keyFor = (userId: string | null, moduleId: string) =>
  userId ? `user:${userId}:flashcards:${moduleId}` : `flashcard-progress:guest:${moduleId}`

let chain: Promise<unknown> = Promise.resolve()

// Runs store updates one after another so reads and writes never overlap.
function queue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task)
  chain = run.catch(() => {})
  return run
}

// Reads the saved store of a module (empty when nothing is saved).
async function readStore(key: string): Promise<Store> {
  const saved: any = await idbGet(key)
  return saved?.cards ? { cards: saved.cards, dirty: saved.dirty || [] } : { cards: {}, dirty: [] }
}

// Loads the progress saved on this device (instant, works offline).
export function loadProgress(userId: string | null, moduleId: string): Promise<ProgressMap> {
  return queue(async () => (await readStore(keyFor(userId, moduleId))).cards)
}

// Saves one reviewed card on the device and marks it for upload when signed in.
export function saveReview(userId: string | null, moduleId: string, cardId: string, progress: ProgressMap[string]) {
  return queue(async () => {
    const key = keyFor(userId, moduleId)
    const store = await readStore(key)
    store.cards[cardId] = progress
    if (userId && !store.dirty.includes(cardId)) store.dirty.push(cardId)
    await idbSet(key, store)
  })
}

// Uploads pending reviews, pulls newer server progress, and returns the merged map (null when skipped).
export async function syncProgress(userId: string | null, moduleId: string): Promise<ProgressMap | null> {
  if (!userId || !navigator.onLine) return null
  const key = keyFor(userId, moduleId)

  const pending = await queue(async () => {
    const store = await readStore(key)
    return store.dirty.filter(id => store.cards[id]).map(id => ({ id, progress: store.cards[id] }))
  })

  const uploaded = new Map<string, string>()
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const slice = pending.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.rpc('save_flashcard_progress', {
      p_rows: slice.map(({ id, progress }) => ({
        card_id: id, due: progress.due, last_review: progress.last_review, card: progress.card,
      })),
    })
    if (error) break
    slice.forEach(({ id, progress }) => uploaded.set(id, progress.last_review))
  }

  const { data: serverRows } = await fetchAllRows(() => supabase
    .from('flashcard_progress')
    .select('card_id, due, last_review, card')
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .order('card_id'))

  return queue(async () => {
    const store = await readStore(key)
    store.dirty = store.dirty.filter(id => !(uploaded.has(id) && store.cards[id]?.last_review === uploaded.get(id)))
    for (const row of (serverRows || []) as any[]) {
      const local = store.cards[row.card_id]
      if (!local || Date.parse(row.last_review) > Date.parse(local.last_review)) {
        store.cards[row.card_id] = { due: row.due, last_review: row.last_review, card: row.card }
      }
    }
    await idbSet(key, store)
    return store.cards
  })
}
