import { WarningIcon } from './ui/tool-icons'

export default function ErrorBanner({ message = "Couldn't load data — check your connection and try again." }) {
  return (
    <div style={{
      background: '#ef444420', border: '1px solid #ef444440',
      borderRadius: 12, padding: '10px 16px', marginBottom: 16,
      textAlign: 'center', fontSize: 13, color: '#ef4444', fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
    }}>
      <WarningIcon color="#ef4444" size={15} /> {message}
    </div>
  )
}
