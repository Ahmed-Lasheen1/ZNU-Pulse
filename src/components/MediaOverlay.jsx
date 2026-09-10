import BackButton from './pulse/BackButton'
import { previewKindFor } from '../lib/embedUrl'
import { PULSE_BG } from './pulse/PulseBackground'

// Full-screen "back + preview" viewer for schedule images/PDFs,
// question-bank PDFs, and lecture videos (Schedule, FilesPage).
//
// Content type detected via previewKindFor() in lib/embedUrl.js.
// Background uses the same PULSE_BG gradient every page sits on.
// Content sits between a header-height gap (so Drive's own toolbar
// isn't covered by the fixed site header above) and a dedicated
// footer bar filled with the gradient's own dark bottom color, so the
// footer reads as a distinct band rather than just "wherever the
// gradient happens to end."
export default function MediaOverlay({ dark, onClose, src, title, fileType, allow, allowFullScreen }) {
  const kind = previewKindFor(src, fileType)
  const headerOffset = 'calc(max(16px, env(safe-area-inset-top)) + 60px)'
  const footerHeight = 'calc(max(16px, env(safe-area-inset-bottom)) + 44px)'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: PULSE_BG, zIndex: 400,
      display: 'flex', flexDirection: 'column'
    }}>
      <BackButton dark={dark} onClick={onClose} />

      {kind === 'image' ? (
        <div style={{
          flex: 1, minHeight: 0, paddingTop: headerOffset,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto'
        }}>
          <img
            src={src}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, paddingTop: headerOffset }}>
          <iframe
            src={src}
            style={{ height: '100%', width: '100%', border: 'none' }}
            title={title}
            allow={allow ?? (kind === 'video' ? 'autoplay; fullscreen' : undefined)}
            allowFullScreen={allowFullScreen ?? (kind === 'video' || undefined)}
          />
        </div>
      )}

      <div aria-hidden style={{ height: footerHeight, flexShrink: 0, background: PULSE_BG }} />
    </div>
  )
}
