import { useEffect } from 'react'
import { useAuth } from '@/core/contexts'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus'
import { plural } from '@/shared/utils/format'

// Runs `sync(userId)` when signed in and online, on mount and whenever the tab becomes visible, with result toasts.
// `sync` must be a stable function returning { synced, rejected } (both counts); `noun` is singular, e.g. "offline attempt".
export function useQueuedSync({ sync, noun, rejectedHint = '' }) {
  const { user } = useAuth()
  const showToast = useToast()
  const online = useOnlineStatus()
  const userId = user?.id

  useEffect(() => {
    if (!userId || !online) return
    let cancelled = false

    async function run() {
      const { synced, rejected } = await sync(userId)
      if (cancelled) return
      if (synced > 0) showToast(`✅ ${plural(synced, noun)} synced`)
      if (rejected > 0) showToast(`⚠️ ${plural(rejected, noun)} couldn't be synced${rejectedHint}`, 'error')
    }

    const onVisible = () => { if (document.visibilityState === 'visible') run() }
    run()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, online, showToast, sync, noun, rejectedHint])
}
