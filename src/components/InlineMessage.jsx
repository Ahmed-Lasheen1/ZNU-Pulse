import { isSuccessMessage } from '../lib/messageStyle'

// Shared success/error banner. Used to be the same block of styles
// copy-pasted in Auth, Profile and Admin. A message is treated as
// "success" if it contains a ✅, otherwise it's shown as an error —
// matching the convention already used across the app (e.g. showMsg
// calls with '✅ ...' or '❌ ...').
export default function InlineMessage({ message }) {
  if (!message) return null
  const isSuccess = isSuccessMessage(message)

  return (
    <div style={{
      background: isSuccess ? '#22c55e20' : '#ef444420',
      border: `1px solid ${isSuccess ? '#22c55e40' : '#ef444440'}`,
      borderRadius: 12, padding: '12px 16px', marginBottom: 16,
      color: isSuccess ? '#22c55e' : '#ef4444', fontSize: 13,
      textAlign: 'center', fontWeight: 600
    }}>
      {message}
    </div>
  )
}
