import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { supabase } from '@/core/supabase'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import { applyTheme } from '@/shared/theme/applyTheme'
import { fetchModulesSorted } from '@/services/content/modules'
import { subscribeOnlinePresence } from '@/services/presence/onlinePresence'
import { migrateGuestDataIfNeeded } from '@/services/history/migrateGuestData'
import { syncContentVersions } from '@/services/content/contentVersions'
import { clearAnswerKeyCaches } from '@/services/content/moduleContent'
import { clearHomeHistory } from '@/services/content/homeData'
import { networkFirst, clearUserCaches } from '@/core/dataCache'
import { flushActiveExam, removeSyncedLocalExams } from '@/services/exam/activeExam'
import { removeFullAttempts } from '@/services/history/fullHistory'
import { unsubscribeFromPush } from '@/services/notifications/pushNotifications'
import { storageGet, storageSet } from '@/core/safeStorage'
import ToastProvider from '@/shared/ui/feedback/ToastProvider'
import HomeEntranceProvider from '@/app/HomeEntranceProvider'
import OfflineStatus from '@/app/shell/OfflineStatus'
import PulseBackground from '@/app/shell/PulseBackground'
import { prefetchPages, RoutedContent } from '@/app/routes'
import { SiteHeader, SiteFooter, ScrollToTop } from '@/app/AppShell'
import { ensureProfile, readStoredUser } from '@/app/session'
import { AuthContextProvider, ModulesContextProvider } from '@/app/ContextProviders'

// Root component: color mode, auth session, modules list and the app shell.
export default function App() {
  const [dark, setDark] = useState(() => storageGet('znu_theme') !== 'light')

  // Saves the color mode and applies it to the document before paint (index.html does the same on first load).
  useLayoutEffect(() => {
    storageSet('znu_theme', dark ? 'dark' : 'light')
    applyTheme(dark)
  }, [dark])

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [modules, setModules] = useState([])
  const [modulesLoaded, setModulesLoaded] = useState(false)
  const [modulesError, setModulesError] = useState(false)

  const lastHandledUserIdRef = useRef(null)

  // Loads the modules list (optionally bypassing the cache) and keeps it fresh in the background.
  async function loadModules(force = false) {
    const result = await fetchModulesSorted({ force, onRevalidated: setModules })
    setModules(result.modules)
    setModulesError(!!result.error)
    setModulesLoaded(true)
    return result
  }

  // Forces a fresh load of the modules list after an admin change.
  const refreshModules = useCallback(() => loadModules(true), [])

  // Loads modules on mount and revalidates when the tab becomes visible or the connection returns.
  useEffect(() => {
    loadModules()
    const revalidate = () => { if (document.visibilityState === 'visible') loadModules() }
    document.addEventListener('visibilitychange', revalidate)
    window.addEventListener('online', revalidate)
    return () => {
      document.removeEventListener('visibilitychange', revalidate)
      window.removeEventListener('online', revalidate)
    }
  }, [])

  // Preloads every lazy page once the browser is idle.
  useEffect(() => {
    if (window.requestIdleCallback) window.requestIdleCallback(prefetchPages)
    else setTimeout(prefetchPages, 3000)
  }, [])

  // Keeps cached content in step with server content versions.
  useEffect(() => {
    const sync = force => syncContentVersions({ force }).then(refChanged => { if (refChanged) loadModules(true) })
    const onVisible = () => { if (document.visibilityState === 'visible') sync(false) }
    sync(true)
    const timer = setInterval(onVisible, 10 * 60 * 1000)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [])

  // Joins the online-presence channel while the app is open.
  useEffect(() => {
    const unsubscribe = subscribeOnlinePresence()
    return unsubscribe
  }, [])

  // Loads the signed-in user's profile (network first, saved copy offline).
  const fetchProfile = useCallback(async (userId) => {
    const { data } = await networkFirst(
      `user:${userId}:profile`,
      () => supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    )
    if (data) setProfile(data)
  }, [])

  // Removes a leftover auth hash from the address bar.
  function cleanUpAuthHash() {
    if (window.location.hash && window.location.hash !== '#/') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  // Creates the profile if needed, loads it and migrates guest data, once per signed-in user.
  async function handleSignedIn(sessionUser) {
    if (lastHandledUserIdRef.current === sessionUser.id) return
    if (!navigator.onLine) {
      await fetchProfile(sessionUser.id)
      return
    }
    lastHandledUserIdRef.current = sessionUser.id
    await ensureProfile(sessionUser)
    await fetchProfile(sessionUser.id)
    migrateGuestDataIfNeeded(sessionUser.id)
  }

  // Restores the session on load and reacts to sign-in and sign-out events.
  useEffect(() => {
    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession()
      const sessionUser = session?.user ?? (!navigator.onLine ? readStoredUser() : null)
      setUser(sessionUser)
      if (sessionUser) await handleSignedIn(sessionUser)
      cleanUpAuthHash()
      setAuthLoaded(true)
    }
    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        setTimeout(() => { handleSignedIn(session.user).finally(cleanUpAuthHash) }, 0)
      } else if (event === 'SIGNED_OUT') {
        const previousUserId = lastHandledUserIdRef.current
        lastHandledUserIdRef.current = null
        setUser(null)
        setProfile(null)
        clearUserCaches()
        if (previousUserId) removeFullAttempts(previousUserId).catch(() => {})
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Saves pending work, signs out and clears the signed-in user's caches.
  const signOut = useCallback(async () => {
    await flushActiveExam().catch(() => {})
    await unsubscribeFromPush()
    if (user?.id) await removeFullAttempts(user.id).catch(() => {})
    await supabase.auth.signOut()
    await removeSyncedLocalExams().catch(() => {})
    setUser(null)
    setProfile(null)
    clearHomeHistory()
    clearAnswerKeyCaches()
    clearUserCaches()
  }, [user])

  // Switches between dark and light mode.
  const toggleTheme = () => setDark(prev => !prev)

  return (
    <AuthContextProvider user={user} signOut={signOut} profile={profile} fetchProfile={fetchProfile} authLoaded={authLoaded}>
      <ModulesContextProvider modules={modules} modulesLoaded={modulesLoaded} modulesError={modulesError} refreshModules={refreshModules}>
      <ToastProvider>
      <Router>
        <HomeEntranceProvider>
        <div style={{
          position: 'relative',
          minHeight: '100dvh',
          color: getPulseTheme(dark).text,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Segoe UI', sans-serif"
        }}>
          <PulseBackground dark={dark} />

          <ScrollToTop />
          <SiteHeader dark={dark} toggleTheme={toggleTheme} />
          <OfflineStatus dark={dark} />
          <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <RoutedContent dark={dark} />
          </main>

          <SiteFooter dark={dark} />
        </div>
        </HomeEntranceProvider>
      </Router>
      </ToastProvider>
      </ModulesContextProvider>
    </AuthContextProvider>
  )
}
