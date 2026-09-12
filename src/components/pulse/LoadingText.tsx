import { ON_GRADIENT_TOP } from '../../premiumTheme'

// Shared "Loading..." line for pages sitting directly on
// PulseBackground (gradient-zone text color, not a Glass token) —
// Schedule, Checklist, FilesPage, AnonQuestions, Search, and Review
// each rendered this exact paragraph independently before.
export default function LoadingText({ label = 'Loading...' }: { label?: string }) {
  return <p style={{ color: ON_GRADIENT_TOP.secondary, textAlign: 'center' }}>{label}</p>
}
