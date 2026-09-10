// src/components/SummaryOverlay.jsx
import { previewKindFor } from '../lib/embedUrl'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'
import { getPulseTheme, pulseFonts } from '../premiumTheme'

const OVERLAY_Z = 2100

// Full-screen "back + preview" viewer — stripped down to just the
// content plus a floating back button. No header bar, no Footer, no
// PULSE_BG gradient behind it: the overlay's own background is a
// plain solid (theme canvas color) so there's nothing else competing
// with the back button or the content itself.
export default function SummaryOverlay({ dark, onBack, url, title, fileType }) {
  const pt = getPulseTheme(dark)
  const kind = previewKindFor(url, fileType)
  useBodyScrollLock(true)

  return (
    <div style={{
      position: 'fixed', inset: 0, height: '100dvh',
      background: pt.canvas, zIndex: OVERLAY_Z, overflowY: 'auto'
    }}>
      <button
        onClick={onBack}
        style={{
          position: 'fixed',
          top: 'max(14px, env(safe-area-inset-top))', left: 16,
          zIndex: 20,
          background: dark ? 'rgba(8,16,32,0.65)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${pt.border}`, borderRadius: 999,
          cursor: 'pointer',
          color: pt.text, fontFamily: pulseFonts.body, fontWeight: 700,
          fontSize: 14, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6
        }}
      >← Back</button>

      {kind === 'image' ? (
        <div style={{
          minHeight: '100dvh', padding: '80px 20px 24px', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <img
            src={url}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div style={{ height: '100dvh' }}>
          <iframe
            src={url}
            style={{ height: '100%', width: '100%', border: 'none', display: 'block' }}
            title={title}
            allow={kind === 'video' ? 'autoplay; fullscreen' : undefined}
            allowFullScreen={kind === 'video' || undefined}
          />
        </div>
      )}
    </div>
  )
}
