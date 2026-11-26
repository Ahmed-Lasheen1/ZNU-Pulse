import { useEffect, useState } from 'react'
import { getModuleOfflineStatus, subscribeOfflineReadiness } from '@/services/content/offlineReadiness'

export type OfflineStatus = 'ready' | 'downloading' | 'missing'

// Follows whether a module's content is saved on this device; reports 'missing' until the first check finishes.
export function useModuleOfflineStatus(moduleId: string): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>('missing')

  // Reads the status when the module changes and again whenever a download starts or ends.
  useEffect(() => {
    let ignore = false
    setStatus('missing')

    // Re-reads the status from the device.
    function refresh() {
      getModuleOfflineStatus(moduleId).then(next => { if (!ignore) setStatus(next) })
    }

    refresh()
    const unsubscribe = subscribeOfflineReadiness(refresh)
    return () => {
      ignore = true
      unsubscribe()
    }
  }, [moduleId])

  return status
}
