import { flushChecklistOutbox } from '@/services/offline/checklistOutbox'
import { useQueuedSync } from '@/services/offline/useQueuedSync'

// Flushes the queue and reports how many changes were sent and how many the server refused.
async function sync(userId) {
  const { synced, rejected } = await flushChecklistOutbox(userId)
  return { synced, rejected: rejected.length }
}

// Flushes queued checklist changes when signed in and online, with toasts.
export function useChecklistSync() {
  useQueuedSync({ sync, noun: 'offline checklist change' })
}
