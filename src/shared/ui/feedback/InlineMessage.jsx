import { isSuccessMessage } from '@/shared/utils/messageStyle'

// Shared success/error banner. Used to be the same block of styles
// copy-pasted in Auth, Profile and Admin. A message is treated as
// "success" if it contains a ✅, otherwise it's shown as an error —
// matching the convention already used across the app (e.g. showMsg
// calls with '✅ ...' or '❌ ...'). The text colors are CSS variables
// (see src/styles/index.css), so they stay readable in both color modes.
export default function InlineMessage({ message }) {
  if (!message) return null
  const isSuccess = isSuccessMessage(message)

  return (
    <div style={{
      background: isSuccess ? 'rgba(34,197,94,0.125)' : 'rgba(239,68,68,0.125)',
      border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
      borderRadius: 12, padding: '12px 16px', marginBottom: 16,
      color: isSuccess ? 'var(--success-text)' : 'var(--danger-text)', fontSize: 13,
      textAlign: 'center', fontWeight: 600
    }}>
      {message}
    </div>
  )
}
