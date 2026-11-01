import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import ErrorBoundary from '@/app/ErrorBoundary'
import Home from '@/features/home/Home'

const pageLoaders = {
  Checklist: () => import('@/features/tools/checklist/Checklist'),
  Schedule: () => import('@/features/tools/schedule/Schedule'),
  FilesPage: () => import('@/features/study/files/FilesPage'),
  MCQ: () => import('@/features/practice/mcq/MCQ'),
  Review: () => import('@/features/practice/review/Review'),
  Summaries: () => import('@/features/study/summaries/Summaries'),
  ModulePage: () => import('@/features/study/module/ModulePage'),
  Auth: () => import('@/features/account/Auth'),
  Profile: () => import('@/features/account/Profile'),
  PulseCheck: () => import('@/features/tools/pulse-check/PulseCheck'),
  ResetPassword: () => import('@/features/account/ResetPassword'),
  NotFound: () => import('@/shared/ui/feedback/NotFound'),
  Search: () => import('@/features/tools/search/Search'),
}

const Pages = Object.fromEntries(Object.entries(pageLoaders).map(([name, load]) => [name, lazy(load)]))

const Admin = lazy(() => import('@/features/admin/Admin'))

export function prefetchPages() {
  if (navigator.connection?.saveData) return
  Object.values(pageLoaders).forEach(load => load().catch(() => {}))
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

function StageRedirect() {
  const { moduleId, stage } = useParams()
  return <Navigate to={`/module/${moduleId}?stage=${encodeURIComponent(stage)}`} replace />
}

// Old links and notifications still point at the previous URL.
function PulseCheckRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/pulse-check${search}`} replace />
}

export function RoutedContent({ dark }) {
  const location = useLocation()
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageLoader dark={dark} />}>
        <Routes>
          <Route path="/" element={<Home dark={dark} />} />
          <Route path="/module/:moduleId" element={<Pages.ModulePage dark={dark} />} />
          <Route path="/module/:moduleId/stage/:stage" element={<StageRedirect />} />
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
          <Route path="/pulse-check" element={<Pages.PulseCheck dark={dark} />} />
          <Route path="/search" element={<Pages.Search dark={dark} />} />
          <Route path="*" element={<Pages.NotFound dark={dark} />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
