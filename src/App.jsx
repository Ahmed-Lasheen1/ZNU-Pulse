// src/App.jsx
import { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import { getPulseTheme } from './premiumTheme'
import { fetchModulesSorted } from './lib/modules'
import { subscribeOnlinePresence } from './lib/onlinePresence'
import { migrateGuestDataIfNeeded } from './lib/migrateGuestData'
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

// ThemeContext/AuthContext/ModulesContext + useTheme/useAuth/useModules
// used to be defined right here. They now live in src/contexts.js (a
// file with zero dependents of its own) because Home.jsx importing
// them FROM App.jsx — combined with App.jsx importing Home.jsx
// directly (not lazily, since it's the landing route) — created a
// real circular dependency: src/App.jsx -> src/pages/Home.jsx ->
// src/App.jsx (confirmed by Rollup's circular-dependency warning).
// Re-exported here so every other page's existing
// `import { useAuth, useModules } from '../App'` keeps working
// unchanged — only Home.jsx (and NotifyPermissionButton.jsx) were
// updated to import directly from '../contexts' instead, since those
// two were the actual source of the cycle.
export { ThemeContext, AuthContext, ModulesContext, useTheme, useAuth, useModules } from './contexts'
// NavMenu also used to be defined here, for the same reason — see
// src/components/NavMenu.jsx. Re-exported so nothing else that
// imports it from '../App' needs to change.
export { default as NavMenu } from './components/NavMenu'

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

// Home renders its own fixed, full-bleed brand header + NavMenu
// directly inline (its content scrolls behind a transparent overlay).
// Every other route now gets the exact same treatment via
// PulseOverlayHeader — a fixed, transparent, non-glass bar with no
// scroll-triggered chrome — plus a spacer matching Home's own internal
// spacer, so page content starts right below where the bar sits
// instead of being hidden underneath it.
function SiteHeader({ dark, toggleTheme }) {
  const location = useLocation()
  if (location.pathname === '/') return null
  return (
    <>
      <PulseOverlayHeader dark={dark} toggleTheme={toggleTheme} />
      <div style={{ height: 'calc(76px + env(safe-area-inset-top))' }} />
    </>
  )
}

// BUG FIX: ErrorBoundary previously sat around the routes but was
// never tied to the current URL, so it never got a fresh start when
// navigating client-side. Once ANY page tripped a render error, the
// boundary's `hasError` stayed true forever — every route visited
// afterward kept showing the fallback screen until a full manual
// reload. This small wrapper lives INSIDE <Router> so it can read the
// current path via useLocation() and hand it to ErrorBoundary as
// `resetKey` — ErrorBoundary clears its own error state whenever that
// key changes (see componentDidUpdate in ErrorBoundary.jsx), so a
// crash on one page no longer poisons every page after it.
// `toggleTheme` is passed in as a prop (rather than closed over)
// because this component, not App() itself, is what renders the Home
// route.
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
    return true // default to dark for first-time visitors
  })

  useEffect(() => {
    localStorage.setItem('znu_theme', dark ? 'dark' : 'light')
  }, [dark])

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  // Tracks whether the initial Supabase session check has finished.
  // Used by Admin.jsx to avoid flashing the 404 page for a moment on
  // every visit (including the real admin's own) before we actually
  // know if this person is signed in and what their role is.
  const [authLoaded, setAuthLoaded] = useState(false)
  const [modules, setModules] = useState([])
  const [modulesLoaded, setModulesLoaded] = useState(false)
  const [modulesError, setModulesError] = useState(false)

  async function loadModules() {
    const { modules: sorted, error } = await fetchModulesSorted()
    setModules(sorted)
    if (error) setModulesError(true)
    setModulesLoaded(true)
  }

  useEffect(() => { loadModules() }, [])

  // Marks this tab/device as "online" for the Admin Analytics tab's
  // live counter (see src/lib/onlinePresence.js). Runs for every
  // visitor — signed in or guest — since anyone using the site should
  // count toward "online now".
  useEffect(() => {
    const unsubscribe = subscribeOnlinePresence()
    return unsubscribe
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setProfile(data)
  }

  // Safety net for Google sign-ins: the app's own email/password
  // signup flow (see Auth.tsx) passes name/account_type into
  // signUp()'s options, which whatever creates `profiles` rows today
  // presumably reads. Google OAuth users never go through that
  // signUp() call at all — Supabase creates their auth.users row
  // directly on first Google login — so without this, a first-time
  // Google sign-in could end up with no profile row at all (blank
  // name everywhere, points that never persist). This checks once per
  // sign-in and only inserts if nothing exists yet; existing users
  // (including existing Google users on a later visit) are untouched.
  async function ensureProfile(user) {
    try {
      const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
      if (existing) return
      const meta = user.user_metadata || {}
      const fallbackName = meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'Student')
      const { error } = await supabase.from('profiles').insert([{ id: user.id, name: fallbackName, points: 0 }])
      if (error) console.warn('[ensureProfile] Could not create profile row:', error.message)
    } catch (e) {
      console.warn('[ensureProfile] Unexpected error:', e)
    }
  }

  // Strips a stray, now-meaningless "#" (or leftover OAuth hash
  // fragment) from the address bar once Supabase has already consumed
  // whatever it needed from it. With flowType: 'pkce' (see
  // src/supabase.js) this rarely has anything to actually clean up —
  // PKCE returns the session via a ?code=... query param instead of a
  // #access_token=... hash — but this stays as a harmless safety net
  // for any stray "#" left behind by a redirect either way. Uses
  // replaceState (not navigate) so it never adds a history entry or
  // triggers a route change.
  function cleanUpAuthHash() {
    if (window.location.hash && window.location.hash !== '#/') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  useEffect(() => {
    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      // Wait for the profile (which carries the admin role) to resolve
      // before marking auth as loaded, so authLoaded=true always means
      // "we know, for sure, whether this person is an admin" — not
      // just "we know if they're signed in".
      if (session?.user) {
        await ensureProfile(session.user)
        await fetchProfile(session.user.id)
        // Covers the case where a guest practiced on this device,
        // then signed in on a PREVIOUS visit and this is simply a
        // later reload with an already-persisted session — Supabase
        // doesn't reliably re-fire a distinct "just signed in" event
        // in that case, so this call has to happen here too, not only
        // in onAuthStateChange below. migrateGuestDataIfNeeded is a
        // no-op (single localStorage read, no network) whenever there
        // is nothing local left to migrate, so calling it on every
        // session check costs nothing once it has run once.
        migrateGuestDataIfNeeded(session.user.id)
      }
      cleanUpAuthHash()
      setAuthLoaded(true)
    }
    initSession()

    // AUDIT FIX (push-notification race for brand-new accounts): this
    // used to be a plain (non-async) callback that called
    // `setUser(session.user)` FIRST and only THEN kicked off
    // `ensureProfile(session.user).then(...)` in the background,
    // unawaited. That meant the app treated the person as "signed in"
    // (Home's notification banner included) the instant sign-in/OTP-
    // verification/Google-OAuth completed, while their `profiles` row
    // might still be mid-insert. A brand-new user who tapped "Enable
    // notifications" in that window had their push subscription saved
    // against an account whose profile row didn't exist yet, and the
    // save failed ("Could not save your subscription — try again
    // later"). Existing users never hit this, since their profile row
    // was created long ago on their original sign-up. This mirrors
    // initSession() above (which already awaits ensureProfile before
    // doing anything else) — now onAuthStateChange does the same:
    // ensureProfile is awaited BEFORE setUser flips the app into
    // "signed in", so by the time anything interactive renders, the
    // profile row is guaranteed to already exist.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await ensureProfile(session.user)
        setUser(session.user)
        await fetchProfile(session.user.id)
        migrateGuestDataIfNeeded(session.user.id)
        cleanUpAuthHash()
      } else {
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

  const bg = dark
    ? 'linear-gradient(135deg, #0a0f1e 0%, #0d1a2e 50%, #0a1628 100%)'
    : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)'

  const toggleTheme = () => setDark(prev => !prev)

  return (
    <ThemeContextProvider dark={dark}>
      <AuthContextProvider user={user} signOut={signOut} profile={profile} fetchProfile={fetchProfile} authLoaded={authLoaded}>
        <ModulesContextProvider modules={modules} modulesLoaded={modulesLoaded} modulesError={modulesError} refreshModules={loadModules}>
        <ToastProvider>
        <Router>
          <div style={{
            background: bg,
            minHeight: '100vh', color: getPulseTheme(dark).text,
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Segoe UI', sans-serif"
          }}>
            <ScrollToTop />
            <SiteHeader dark={dark} toggleTheme={toggleTheme} />
            <div style={{ flex: 1 }}>
              <RoutedContent dark={dark} toggleTheme={toggleTheme} />
            </div>
            <Footer dark={dark} />
          </div>
        </Router>
        </ToastProvider>
        </ModulesContextProvider>
      </AuthContextProvider>
    </ThemeContextProvider>
  )
}

// Thin provider wrappers so the JSX above stays readable — same
// contexts as before, just sourced from ./contexts now.
function ThemeContextProvider({ dark, children }) {
  return <ThemeContext.Provider value={{ dark }}>{children}</ThemeContext.Provider>
}
function AuthContextProvider({ user, signOut, profile, fetchProfile, authLoaded, children }) {
  return <AuthContext.Provider value={{ user, signOut, profile, fetchProfile, authLoaded }}>{children}</AuthContext.Provider>
}
function ModulesContextProvider({ modules, modulesLoaded, modulesError, refreshModules, children }) {
  return <ModulesContext.Provider value={{ modules, modulesLoaded, modulesError, refreshModules }}>{children}</ModulesContext.Provider>
}
