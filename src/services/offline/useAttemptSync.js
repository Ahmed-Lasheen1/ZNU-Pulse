import { useEffect } from 'react'
import { useAuth } from '@/core/contexts'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus'
import { syncPendingAttempts } from '@/services/offline/offlineAttempts'

// Formats a count as "1 offline attempt" or "N offline attempts".
const plural = count => `${count} offline attempt${count === 1 ? '' : 's'}`

// Syncs saved offline attempts when signed in and online, with toasts.
export function useAttemptSync() {
  const { user } = useAuth()
  const showToast = useToast()
  const online = useOnlineStatus()
  const userId = user?.id

  useEffect(() => {
    if (!userId || !online) return
    let cancelled = false

    async function run() {
      const { synced, rejected } = await syncPendingAttempts(userId)
      if (cancelled) return
      if (synced > 0) showToast(`✅ ${plural(synced)} synced`)
      if (rejected > 0) showToast(`⚠️ ${plural(rejected)} couldn't be synced — open Review to retry or remove`, 'error')
    }

    const onVisible = () => { if (document.visibilityState === 'visible') run() }
    run()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, online, showToast])
}
