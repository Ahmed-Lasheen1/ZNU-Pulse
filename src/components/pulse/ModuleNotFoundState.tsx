// src/components/pulse/ModuleNotFoundState.tsx
import ErrorBanner from '../ErrorBanner'
import LoadingText from './LoadingText'
import { ON_GRADIENT_TOP } from '../../premiumTheme'

interface ModuleNotFoundStateProps {
  hasError: boolean
  loaded: boolean
  errorMessage?: string
}

// Shared "module not found / still loading / failed to load" screen,
// used by ModulePage and StagePage whenever the parent module can't be resolved.
export default function ModuleNotFoundState({
  hasError,
  loaded,
  errorMessage = "Couldn't load this — check your connection.",
}: ModuleNotFoundStateProps) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 1, padding: 24, textAlign: 'center', color: ON_GRADIENT_TOP.secondary }}>
        {hasError
          ? <ErrorBanner message={errorMessage} />
          : !loaded
            ? <div style={{ maxWidth: 900, margin: '0 auto' }}><LoadingText /></div>
            : "This module doesn't exist or was removed."}
      </div>
    </div>
  )
}
