import PageShell from '@/shared/ui/layout/PageShell'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import { ON_BACKGROUND } from '@/shared/theme/premiumTheme'

interface ModuleFallbackPageProps {
  dark: boolean
  hasError: boolean
  loaded: boolean
  maxWidth?: number
}

// Page shown by the Flashcards and Summaries pages while no module can be resolved (error, still loading, or none exist).
export default function ModuleFallbackPage({ dark, hasError, loaded, maxWidth = 900 }: ModuleFallbackPageProps) {
  return (
    <PageShell dark={dark} backFallback="/" maxWidth={maxWidth}>
      <div style={{ textAlign: 'center', padding: 40, color: ON_BACKGROUND.secondary }}>
        {hasError
          ? <ErrorBanner message="Couldn't load modules — check your connection." />
          : !loaded ? 'Loading...' : 'No modules available yet.'}
      </div>
    </PageShell>
  )
}
