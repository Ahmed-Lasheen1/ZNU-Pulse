import { syncPendingAttempts } from '@/services/offline/offlineAttempts'
import { useQueuedSync } from '@/services/offline/useQueuedSync'

const sync = userId => syncPendingAttempts(userId)

// Syncs saved offline attempts when signed in and online, with toasts.
export function useAttemptSync() {
  useQueuedSync({ sync, noun: 'offline attempt', rejectedHint: ' — open Review to retry or remove' })
}
