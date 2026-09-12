import PulseBackground from './PulseBackground'
import ErrorBanner from '../ErrorBanner'
import { ON_GRADIENT_TOP } from '../../premiumTheme'

interface ModuleNotFoundStateProps {
  hasError: boolean
  loaded: boolean
  errorMessage?: string
}

// Shared "module not found / still loading / failed to load" screen,
// used by ModulePage, StagePage, SubjectPage, and LessonPage whenever
// the parent module can't be resolved.
export default function ModuleNotFoundState({
  hasError,
  loaded,
  errorMessage = "Couldn't load this — check your connection.",
}: ModuleNotFoundStateProps) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: 24, textAlign: 'center', color: ON_GRADIENT_TOP.secondary }}>
        {hasError
          ? <ErrorBanner message={errorMessage} />
          : !loaded ? 'Loading...' : "This module doesn't exist or was removed."}
      </div>
    </div>
  )
}
