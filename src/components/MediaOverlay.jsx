import BackButton from './pulse/BackButton'
import Footer from './Footer'
import { previewKindFor } from '../lib/embedUrl'
import { PULSE_BG } from './pulse/PulseBackground'

const HEADER_OFFSET = 'calc(max(16px, env(safe-area-inset-top)) + 60px)'

// Full-screen "back + preview" viewer for schedule images/PDFs,
// question-bank PDFs, and lecture videos (Schedule, FilesPage).
//
// The outer container scrolls (overflowY: auto) so the real site
// Footer can sit right after the content in normal flow — reachable
// by scrolling down, not pinned to the bottom like the header is.
// Content itself fills the visible viewport height on load (minus
// the header gap), same as before.
export default function MediaOverlay({ dark, onClose, src, title, fileType, allow, allowFullScreen }) {
  const kind = previewKindFor(src, fileType)

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: PULSE_BG, zIndex: 400, overflowY: 'auto'
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
