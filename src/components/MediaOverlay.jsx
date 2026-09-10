// src/components/MediaOverlay.jsx
import Footer from './Footer'
import { previewKindFor } from '../lib/embedUrl'
import { PULSE_BG } from './pulse/PulseBackground'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'
import { getPulseTheme, pulseFonts } from '../premiumTheme'

const OVERLAY_Z = 2100

export default function MediaOverlay({ dark, onClose, src, title, fileType, allow, allowFullScreen }) {
  const pt = getPulseTheme(dark)
  const kind = previewKindFor(src, fileType)
  useBodyScrollLock(true)

  return (
    <div style={{
      position: 'fixed', inset: 0, height: '100dvh',
      background: PULSE_BG, zIndex: OVERLAY_Z, overflowY: 'auto'
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center',
        padding: 'max(14px, env(safe-area-inset-top)) 20px 14px',
        background: dark ? 'rgba(8,16,32,0.65)' : 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${pt.border}`,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: pt.text, fontFamily: pulseFonts.body, fontWeight: 700,
            fontSize: 14, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6
          }}
        >← Back</button>
      </div>

      {kind === 'image' ? (
        <div style={{
          minHeight: '60dvh', padding: '24px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <img
            src={src}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '80dvh', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div style={{ height: '80dvh' }}>
          <iframe
            src={src}
            style={{ height: '100%', width: '100%', border: 'none' }}
            title={title}
            allow={allow ?? (kind === 'video' ? 'autoplay; fullscreen' : undefined)}
            allowFullScreen={allowFullScreen ?? (kind === 'video' || undefined)}
          />
        </div>
      )}

      <Footer dark={dark} />
    </div>
  )
}
