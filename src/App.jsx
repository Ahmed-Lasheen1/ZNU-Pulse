// src/App.jsx
import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import { getPulseTheme } from './premiumTheme'
import { fetchModulesSorted } from './lib/modules'
import { subscribeOnlinePresence } from './lib/onlinePresence'
import { migrateGuestDataIfNeeded } from './lib/migrateGuestData'
import { useOncePerSession } from './lib/useOncePerSession'
import ErrorBoundary from './components/ErrorBoundary'
import ToastProvider from './components/ToastProvider'
import PulseOverlayHeader from './components/pulse/PulseOverlayHeader'
import { ThemeContext, AuthContext, ModulesContext } from './contexts'
import Home from './pages/Home'
const Checklist = lazy(() => import('./pages/Checklist'))
const Schedule = lazy(() => import('./pages/Schedule'))
const FilesPage = lazy(() => import('./pages/FilesPage'))
const Admin = lazy(() => import('./pages/Admin'))
const MCQ = lazy(() => import('./pages/MCQ'))
const Review = lazy(() => import('./pages/Review'))
const Summaries = lazy(() => import('./pages/Summaries'))
const ModulePage = lazy(() => import('./pages/ModulePage'))
const StagePage = lazy(() => import('./pages/StagePage'))
const SubjectPage = lazy(() => import('./pages/SubjectPage'))
const LessonPage = lazy(() => import('./pages/LessonPage'))
const Auth = lazy(() => import('./pages/Auth'))
const Profile = lazy(() => import('./pages/Profile'))
const AnonQuestions = lazy(() => import('./pages/AnonQuestions'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Search = lazy(() => import('./pages/Search'))
import Footer from './components/Footer'

export { ThemeContext, AuthContext, ModulesContext, useTheme, useAuth, useModules } from './contexts'
export { default as NavMenu } from './components/NavMenu'

const ensureProfileInFlight = new Set()

async function ensureProfile(user) {
  if (ensureProfileInFlight.has(user.id)) return
  ensureProfileInFlight.add(user.id)
  try {
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (existing) return
    const meta = user.user_metadata || {}
    const fallbackName = meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'Student')
    const { error } = await supabase.from('profiles').insert([{ id: user.id, name: fallbackName, points: 0 }])
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

function SiteHeader({ dark, toggleTheme }) {
  const location = useLocation()
  if (location.pathname === '/') return null
  return (
    <>
      <PulseOverlayHeader dark={dark} toggleTheme={toggleTheme} />
      {/* Matches PulseOverlayHeader's rendered height (76px + safe-area-inset-top) */}
      <div style={{ height: 'calc(76px + env(safe-area-inset-top, 0px))' }} />
    </>
  )
}

// Renders the shared Footer, only animating its entrance on Home and
// only once per tab session (own useOncePerSession key so it never
// races Home's own entrance flag).
function SiteFooter({ dark }) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const playEntrance = useOncePerSession('znu_home_footer_entrance_played')
  return <Footer dark={dark} animate={isHome && playEntrance} />
}

function RoutedContent({ dark, toggleTheme }) {
  const location = useLocation()
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageLoader dark={dark} />}>
        <Routes>
          <Route path="/" element={<Home dark={dark} toggleTheme={toggleTheme} />} />
          <Route path="/module/:moduleId" element={<ModulePage dark={dark} />} />
          <Route path="/module/:moduleId/stage/:stage" element={<StagePage dark={dark} />} />
          <Route path="/module/:moduleId/subject/:subjectId" element={<SubjectPage dark={dark} />} />
          <Route path="/module/:moduleId/subject/:subjectId/lesson/:lessonId" element={<LessonPage dark={dark} />} />
          <Route path="/checklist" element={<Checklist dark={dark} />} />
          <Route path="/schedule" element={<Schedule dark={dark} />} />
          <Route path="/files" element={<FilesPage dark={dark} />} />
          <Route path="/summaries" element={<Summaries dark={dark} />} />
          <Route path="/admin" element={<Admin dark={dark} />} />
          <Route path="/mcq" element={<MCQ dark={dark} />} />
          <Route path="/review" element={<Review dark={dark} />} />
          <Route path="/auth" element={<Auth dark={dark} />} />
          <Route path="/reset-password" element={<ResetPassword dark={dark} />} />
          <Route path="/profile" element={<Profile dark={dark} />} />
          <Route path="/anon-questions" element={<AnonQuestions dark={dark} />} />
          <Route path="/search" element={<Search dark={dark} />} />
          <Route path="*" element={<NotFound dark={dark} />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('znu_theme')
    if (saved === 'light') return false
    if (saved === 'dark') return true
    return true
  })

  useEffect(() => {
    localStorage.setItem('znu_theme', dark ? 'dark' : 'light')
  }, [dark])

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [modules, setModules] = useState([])
  const [modulesLoaded, setModulesLoaded] = useState(false)
  const [modulesError, setModulesError] = useState(false)

  const lastHandledUserIdRef = useRef(null)

  async function loadModules() {
    const { modules: sorted, error } = await fetchModulesSorted()
    setModules(sorted)
    if (error) setModulesError(true)
    setModulesLoaded(true)
    // Returned so callers (e.g. Admin) can reuse this fetch instead of re-querying.
    return { modules: sorted, error }
  }

  useEffect(() => { loadModules() }, [])

  useEffect(() => {
    const unsubscribe = subscribeOnlinePresence()
    return unsubscribe
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        await handleSignedIn(session.user)
        cleanUpAuthHash()
      } else {
        lastHandledUserIdRef.current = null
        setUser(null)
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const toggleTheme = () => setDark(prev => !prev)

  return (
    <ThemeContextProvider dark={dark}>
      <AuthContextProvider user={user} signOut={signOut} profile={profile} fetchProfile={fetchProfile} authLoaded={authLoaded}>
        <ModulesContextProvider modules={modules} modulesLoaded={modulesLoaded} modulesError={modulesError} refreshModules={loadModules}>
        <ToastProvider>
        <Router>
          {/* Main Layout Container */}
          <div style={{
            position: 'relative', /* Positions content context cleanly over background */
            minHeight: '100dvh', 
            color: getPulseTheme(dark).text,
            display: 'flex', 
            flexDirection: 'column',
            fontFamily: "'Segoe UI', sans-serif"
          }}>
            {/* Page Essentials & Content */}
            <ScrollToTop />
            <SiteHeader dark={dark} toggleTheme={toggleTheme} />
            <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
              <RoutedContent dark={dark} toggleTheme={toggleTheme} />
            </main>
            
            {/* Footer Layer */}
            <SiteFooter dark={dark} />
          </div>
        </Router>
        </ToastProvider>
        </ModulesContextProvider>
      </AuthContextProvider>
    </ThemeContextProvider>
  )
}

function ThemeContextProvider({ dark, children }) {
  return <ThemeContext.Provider value={{ dark }}>{children}</ThemeContext.Provider>
}
function AuthContextProvider({ user, signOut, profile, fetchProfile, authLoaded, children }) {
  return <AuthContext.Provider value={{ user, signOut, profile, fetchProfile, authLoaded }}>{children}</AuthContext.Provider>
}
function ModulesContextProvider({ modules, modulesLoaded, modulesError, refreshModules, children }) {
  return <ModulesContext.Provider value={{ modules, modulesLoaded, modulesError, refreshModules }}>{children}</ModulesContext.Provider>
}
