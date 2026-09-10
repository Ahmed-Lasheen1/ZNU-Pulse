import BackButton from './pulse/BackButton'
import { previewKindFor } from '../lib/embedUrl'
import { PULSE_BG } from './pulse/PulseBackground'

// Full-screen "back + preview" viewer for schedule images/PDFs,
// question-bank PDFs, and lecture videos (Schedule, FilesPage).
//
// Content type is detected the same way SummaryOverlay does:
// `fileType` is an optional hint ('pdf' | 'image' | 'video') a caller
// can pass when it already knows the kind (e.g. a stored file_type
// column) — without a hint, the kind is inferred from the URL itself
// via previewKindFor() in lib/embedUrl.js.
//
// Background uses the same PULSE_BG gradient every other page sits
// on, instead of solid black — so the light top zone shows behind the
// fixed site header (rather than a hard black bar), and the gradient
// naturally darkens toward the bottom to match the rest of the app.
//
// Iframe/image content is pushed down below the header's real height
// (headerOffset) so any toolbar the embedded content shows near its
// own top edge — e.g. Google Drive's preview toolbar — isn't
// physically covered by the header sitting above it.
export default function MediaOverlay({ dark, onClose, src, title, fileType, allow, allowFullScreen }) {
  const kind = previewKindFor(src, fileType)
  const headerOffset = 'calc(max(16px, env(safe-area-inset-top)) + 60px)'

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
    </div>
  )
}
