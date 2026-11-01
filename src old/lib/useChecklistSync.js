import { useEffect } from 'react'
import { useAuth } from '../contexts'
import { useToast } from '../components/ToastProvider'
import { useOnlineStatus } from './useOnlineStatus'
import { flushChecklistOutbox } from './checklistOutbox'

const changes = count => `${count} offline checklist change${count === 1 ? '' : 's'}`

export function useChecklistSync() {
  const { user } = useAuth()
  const showToast = useToast()
  const online = useOnlineStatus()
  const userId = user?.id

  useEffect(() => {
    if (!userId || !online) return
    let cancelled = false

    async function run() {
      const { synced, rejected } = await flushChecklistOutbox(userId)
      if (cancelled) return
      if (synced > 0) showToast(`✅ ${changes(synced)} synced`)
      if (rejected.length > 0) showToast(`⚠️ ${changes(rejected.length)} couldn't be synced`, 'error')
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
