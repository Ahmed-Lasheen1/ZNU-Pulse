// src/components/FullscreenViewer.jsx
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { previewKindFor } from '../lib/embedUrl'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'
import { getPulseTheme, pulseFonts } from '../premiumTheme'

const OVERLAY_Z = 2100

// Restricts what an embedded page can do (no top-level navigation,
// no parent-frame access) while still allowing the scripts/forms that
// Drive previews, YouTube embeds, and admin-published HTML summaries
// need to function.
const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation'

// Shared full-screen "back + preview" viewer used by SummaryOverlay and
// MediaOverlay. Portaled to document.body so its z-index always
// competes globally against the site header.
export default function FullscreenViewer({ dark, onClose, src, title, fileType, allow, allowFullScreen }) {
  const pt = getPulseTheme(dark)
  const kind = previewKindFor(src, fileType)
  useBodyScrollLock(true)

  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, height: '100dvh',
      background: pt.canvas, zIndex: OVERLAY_Z, overflowY: 'auto'
    }}>
      <button
        onClick={onClose}
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
            src={src}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div style={{ height: '100dvh' }}>
          <iframe
            src={src}
            style={{ height: '100%', width: '100%', border: 'none', display: 'block' }}
            title={title}
            sandbox={IFRAME_SANDBOX}
            allow={allow ?? (kind === 'video' ? 'autoplay; fullscreen' : undefined)}
            allowFullScreen={allowFullScreen ?? (kind === 'video' || undefined)}
          />
        </div>
      )}
    </div>,
    document.body
  )
}
