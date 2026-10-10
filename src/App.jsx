// src/App.jsx
import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import { getPulseTheme } from './premiumTheme'
import { fetchModulesSorted } from './lib/modules'
import { subscribeOnlinePresence } from './lib/onlinePresence'
import { migrateGuestDataIfNeeded } from './lib/migrateGuestData'
import { unsubscribeFromPush } from './lib/pushNotifications'
import { useOncePerSession } from './lib/useOncePerSession'
import { storageGet, storageSet } from './lib/safeStorage'
import { containsProfanity } from './lib/moderation'
import ErrorBoundary from './components/ErrorBoundary'
import ToastProvider from './components/ToastProvider'
import HomeEntranceProvider from './components/HomeEntranceProvider'
import PulseOverlayHeader from './components/pulse/PulseOverlayHeader'
import OfflineStatus from './components/pulse/OfflineStatus'
import { AuthContext, ModulesContext } from './contexts'
import Home from './pages/Home'
import PulseBackground from './components/pulse/PulseBackground'
import Footer from './components/Footer'

const pageLoaders = {
  Checklist: () => import('./pages/Checklist'),
  Schedule: () => import('./pages/Schedule'),
  FilesPage: () => import('./pages/FilesPage'),
  MCQ: () => import('./pages/MCQ'),
  Review: () => import('./pages/Review'),
  Summaries: () => import('./pages/Summaries'),
  ModulePage: () => import('./pages/ModulePage'),
  StagePage: () => import('./pages/StagePage'),
  Auth: () => import('./pages/Auth'),
  Profile: () => import('./pages/Profile'),
  AnonQuestions: () => import('./pages/AnonQuestions'),
  ResetPassword: () => import('./pages/ResetPassword'),
  NotFound: () => import('./pages/NotFound'),
  Search: () => import('./pages/Search'),
}
const Pages = Object.fromEntries(Object.entries(pageLoaders).map(([name, load]) => [name, lazy(load)]))
const Admin = lazy(() => import('./pages/Admin'))

// Downloads every student-facing page once the browser is idle so the
// service worker has them cached before the connection drops.
function prefetchPages() {
  if (navigator.connection?.saveData) return
  Object.values(pageLoaders).forEach(load => load().catch(() => {}))
}

const ensureProfileInFlight = new Set()

async function ensureProfile(user) {
  if (ensureProfileInFlight.has(user.id)) return
  ensureProfileInFlight.add(user.id)
  try {
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (existing) return
    const meta = user.user_metadata || {}
    const raw = (meta.full_name || meta.name || '').trim().slice(0, 60)
    const name = raw && !containsProfanity(raw) ? raw : 'Student'
    let { error } = await supabase.from('profiles').insert([{ id: user.id, name, points: 0 }])
    if (error && name !== 'Student') {
      ({ error } = await supabase.from('profiles').insert([{ id: user.id, name: 'Student', points: 0 }]))
    }
    if (error) console.warn('[ensureProfile] Could not create profile row:', error.message)
  } catch (e) {
    console.warn('[ensureProfile] Unexpected error:', e)
  } finally {
    ensureProfileInFlight.delete(user.id)
  }
}

function PageLoader({ dark }) {
  const pt = getPulseTheme(dark)
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ color: pt.textMuted, fontSize: 14, fontWeight: 600 }}>Loading...</div>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// One persistent header on every page. Only the spacer differs:
// Home has its own inside its content.
function SiteHeader({ dark, toggleTheme }) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  return (
    <>
      <PulseOverlayHeader dark={dark} toggleTheme={toggleTheme} />
      {!isHome && <div style={{ height: 'calc(76px + env(safe-area-inset-top, 0px))' }} />}
    </>
  )
}

function SiteFooter({ dark }) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const playEntrance = useOncePerSession('znu_home_footer_entrance_played')
  return <Footer dark={dark} animate={isHome && playEntrance} />
}

function RoutedContent({ dark }) {
  const location = useLocation()
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageLoader dark={dark} />}>
        <Routes>
          <Route path="/" element={<Home dark={dark} />} />
          <Route path="/module/:moduleId" element={<Pages.ModulePage dark={dark} />} />
          <Route path="/module/:moduleId/stage/:stage" element={<Pages.StagePage dark={dark} />} />
          <Route path="/checklist" element={<Pages.Checklist dark={dark} />} />
          <Route path="/schedule" element={<Pages.Schedule dark={dark} />} />
          <Route path="/files" element={<Pages.FilesPage dark={dark} />} />
          <Route path="/summaries" element={<Pages.Summaries dark={dark} />} />
          <Route path="/admin" element={<Admin dark={dark} />} />
          <Route path="/mcq" element={<Pages.MCQ dark={dark} />} />
          <Route path="/review" element={<Pages.Review dark={dark} />} />
          <Route path="/auth" element={<Pages.Auth dark={dark} />} />
          <Route path="/reset-password" element={<Pages.ResetPassword dark={dark} />} />
          <Route path="/profile" element={<Pages.Profile dark={dark} />} />
          <Route path="/anon-questions" element={<Pages.AnonQuestions dark={dark} />} />
          <Route path="/search" element={<Pages.Search dark={dark} />} />
          <Route path="*" element={<Pages.NotFound dark={dark} />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  const [dark, setDark] = useState(() => storageGet('znu_theme') !== 'light')

  useEffect(() => {
    storageSet('znu_theme', dark ? 'dark' : 'light')
  }, [dark])

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [modules, setModules] = useState([])
  const [modulesLoaded, setModulesLoaded] = useState(false)
  const [modulesError, setModulesError] = useState(false)

  const lastHandledUserIdRef = useRef(null)

  async function loadModules(force = false) {
    const result = await fetchModulesSorted({ force, onRevalidated: setModules })
    setModules(result.modules)
    setModulesError(!!result.error)
    setModulesLoaded(true)
    return result
  }

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

  useEffect(() => {
    if (window.requestIdleCallback) window.requestIdleCallback(prefetchPages)
    else setTimeout(prefetchPages, 3000)
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeOnlinePresence()
    return unsubscribe
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (data) setProfile(data)
  }

  function cleanUpAuthHash() {
    if (window.location.hash && window.location.hash !== '#/') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  async function handleSignedIn(sessionUser) {
    if (lastHandledUserIdRef.current === sessionUser.id) return
    lastHandledUserIdRef.current = sessionUser.id
    await ensureProfile(sessionUser)
    await fetchProfile(sessionUser.id)
    migrateGuestDataIfNeeded(sessionUser.id)
  }

  useEffect(() => {
    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) await handleSignedIn(session.user)
      cleanUpAuthHash()
      setAuthLoaded(true)
    }
    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setTimeout(() => { handleSignedIn(session.user).finally(cleanUpAuthHash) }, 0)
      } else {
        lastHandledUserIdRef.current = null
        setUser(null)
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await unsubscribeFromPush()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const toggleTheme = () => setDark(prev => !prev)

  return (
    <AuthContextProvider user={user} signOut={signOut} profile={profile} fetchProfile={fetchProfile} authLoaded={authLoaded}>
      <ModulesContextProvider modules={modules} modulesLoaded={modulesLoaded} modulesError={modulesError} refreshModules={() => loadModules(true)}>
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
          <PulseBackground />

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

function AuthContextProvider({ user, signOut, profile, fetchProfile, authLoaded, children }) {
  return <AuthContext.Provider value={{ user, signOut, profile, fetchProfile, authLoaded }}>{children}</AuthContext.Provider>
}
function ModulesContextProvider({ modules, modulesLoaded, modulesError, refreshModules, children }) {
  return <ModulesContext.Provider value={{ modules, modulesLoaded, modulesError, refreshModules }}>{children}</ModulesContext.Provider>
}
