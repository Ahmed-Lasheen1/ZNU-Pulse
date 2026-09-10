import BackButton from './pulse/BackButton'
import Footer from './Footer'
import { previewKindFor } from '../lib/embedUrl'
import { PULSE_BG } from './pulse/PulseBackground'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'

const HEADER_OFFSET = 'calc(max(16px, env(safe-area-inset-top)) + 60px)'
// Above SiteHeader (500) and NavMenu's button/panel (2000/1999) — see
// SummaryOverlay.jsx for the same reasoning.
const OVERLAY_Z = 2100

// Full-screen "back + preview" viewer for schedule images/PDFs,
// question-bank PDFs, and lecture videos (Schedule, FilesPage).
export default function MediaOverlay({ dark, onClose, src, title, fileType, allow, allowFullScreen }) {
  const kind = previewKindFor(src, fileType)
  useBodyScrollLock(true)

  return (
    <div style={{
      position: 'fixed', inset: 0, height: '100dvh',
      background: PULSE_BG, zIndex: OVERLAY_Z, overflowY: 'auto'
    }}>
      <BackButton dark={dark} onClick={onClose} />

      {kind === 'image' ? (
        <div style={{
          paddingTop: HEADER_OFFSET, height: `calc(100dvh - ${HEADER_OFFSET})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <img
            src={src}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div style={{ paddingTop: HEADER_OFFSET, height: `calc(100dvh - ${HEADER_OFFSET})` }}>
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
