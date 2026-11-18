import { useEffect } from 'react'
import { useAuth } from '@/core/contexts'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import { useLimitedAppearance } from '@/shared/hooks/useLimitedAppearance'
import { requestPersistentStorage } from '@/core/storagePersistence'

const IOS_HINT = "Tip: add ZNU Pulse to your Home Screen (Share → Add to Home Screen) so iOS doesn't clear your offline data after a week away."
const MAX_HINT_SHOWS = 3

// True on iPhone/iPad when the app runs in a normal Safari tab rather than from the Home Screen.
function isIosBrowserTab() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches
  return ios && !standalone
}

// Protects offline data for signed-in users: asks the browser for persistent storage, and on iOS browser tabs
// (where that is always refused and unused sites are cleared after 7 days) suggests adding the app to the Home Screen.
export function useStorageSafety() {
  const { user } = useAuth()
  const showToast = useToast()
  const userId = user?.id
  const needsHint = !!userId && isIosBrowserTab()
  const hintAllowed = useLimitedAppearance('znu_ios_install_hint', needsHint, MAX_HINT_SHOWS)

  // Requests persistent storage once per sign-in.
  useEffect(() => {
    if (userId) requestPersistentStorage()
  }, [userId])

  // Shows the Home Screen tip on the first few visits.
  useEffect(() => {
    if (needsHint && hintAllowed) showToast(IOS_HINT, 'info')
  }, [needsHint, hintAllowed, showToast])
}
