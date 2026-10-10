import { useEffect } from 'react'
import { useAuth } from '../contexts'
import { useToast } from '../components/ToastProvider'
import { useOnlineStatus } from './useOnlineStatus'
import { syncPendingAttempts } from './offlineAttempts'

const plural = count => `${count} offline attempt${count === 1 ? '' : 's'}`

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
