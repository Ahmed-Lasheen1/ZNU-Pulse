import { supabase } from '@/core/supabase'
import { fetchAllRows } from '@/core/fetchAllRows'
import { idbGet, idbSet, idbDelete, idbKeys } from '@/core/idb'
import { isDue, newerProgress, type ProgressMap } from '@/services/flashcards/scheduler'

// Saved progress of one module and the ids of cards not yet uploaded.
interface Store {
  cards: ProgressMap
  dirty: string[]
}

const BATCH_SIZE = 500
const GUEST_PREFIX = 'flashcard-progress:guest:'

// Key prefix shared by every module store of one owner (null = guest).
// Signed-in data lives under "user:" so sign-out clears it with the other per-user caches.
const prefixFor = (userId: string | null) => (userId ? `user:${userId}:flashcards:` : GUEST_PREFIX)
const keyFor = (userId: string | null, moduleId: string) => `${prefixFor(userId)}${moduleId}`

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
  return saved?.cards
    ? { cards: saved.cards, dirty: saved.dirty || [] }
    : { cards: {}, dirty: [] }
}

// Reads every saved module store of one owner as [moduleId, cards] pairs.
async function readOwnerStores(userId: string | null): Promise<[string, ProgressMap][]> {
  const prefix = prefixFor(userId)
  const keys = (await idbKeys()).filter((k): k is string => typeof k === 'string' && k.startsWith(prefix))
  return Promise.all(keys.map(async key => [key.slice(prefix.length), (await readStore(key)).cards] as [string, ProgressMap]))
}

// Loads the progress saved on this device (instant, works offline).
export function loadProgress(userId: string | null, moduleId: string): Promise<ProgressMap> {
  return queue(async () => (await readStore(keyFor(userId, moduleId))).cards)
}

// Loads the last review time of every studied card across all modules (used for the daily streak).
export function loadReviewTimes(userId: string | null): Promise<string[]> {
  return queue(async () => {
    const stores = await readOwnerStores(userId)
    return stores.flatMap(([, cards]) => Object.values(cards).map(entry => entry.last_review))
  })
}

// Counts due cards per module. Only cards that still exist (liveCardIdsByModule) are counted,
// so cards deleted by an admin no longer show up as due. Modules missing from the map are skipped.
export function loadDueCounts(
  userId: string | null,
  liveCardIdsByModule: Record<string, Set<string>>
): Promise<Record<string, number>> {
  return queue(async () => {
    const now = new Date()
    const counts: Record<string, number> = {}
    for (const [moduleId, liveIds] of Object.entries(liveCardIdsByModule)) {
      const { cards } = await readStore(keyFor(userId, moduleId))
      const due = Object.entries(cards)
        .filter(([cardId, entry]) => liveIds.has(cardId) && isDue(entry, now))
        .length
      if (due > 0) counts[moduleId] = due
    }
    return counts
  })
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

// Moves flashcard progress saved while signed out into the account, marking it for upload.
export function migrateGuestFlashcards(userId: string): Promise<void> {
  return queue(async () => {
    const guestKeys = (await idbKeys()).filter((k): k is string => typeof k === 'string' && k.startsWith(GUEST_PREFIX))

    for (const guestKey of guestKeys) {
      const moduleId = guestKey.slice(GUEST_PREFIX.length)
      const guest = await readStore(guestKey)

      if (Object.keys(guest.cards).length > 0) {
        const key = keyFor(userId, moduleId)
        const store = await readStore(key)
        const merged = newerProgress(store.cards, guest.cards)
        // Cards where the guest review won (or the account had none) still need uploading.
        Object.keys(guest.cards).forEach(id => {
          if (merged[id] === guest.cards[id] && !store.dirty.includes(id)) store.dirty.push(id)
        })
        store.cards = merged
        // Only drop the guest copy once the account copy is safely stored.
        if ((await idbSet(key, store)) === null) continue
      }
      await idbDelete(guestKey)
    }
  })
}
