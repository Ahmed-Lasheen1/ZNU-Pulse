import { WarningIcon } from '@/shared/icons/tool-icons'

// Red inline banner for load/save errors. The text color is a CSS variable (see src/styles/index.css),
// so it stays readable on both the dark and the light page.
export default function ErrorBanner({ message = "Couldn't load data — check your connection and try again." }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.125)', border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: 12, padding: '10px 16px', marginBottom: 16,
      textAlign: 'center', fontSize: 13, color: 'var(--danger-text)', fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
    }}>
      <WarningIcon color="var(--danger-text)" size={15} /> {message}
    </div>
  )
}
