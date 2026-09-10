import BackButton from './pulse/BackButton'
import { previewKindFor } from '../lib/embedUrl'

// Full-screen "back + preview" viewer for schedule images/PDFs,
// question-bank PDFs, and lecture videos (Schedule, FilesPage).
// Same content-type detection as SummaryOverlay: `fileType` is an
// optional hint ('pdf' | 'image' | 'video') a caller can pass when it
// already knows the kind (e.g. a stored file_type column) — without
// a hint, the kind is inferred from the URL itself.
export default function MediaOverlay({ dark, onClose, src, title, fileType, allow, allowFullScreen }) {
  const kind = previewKindFor(src, fileType)
  const headerOffset = 'calc(max(16px, env(safe-area-inset-top)) + 60px)'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.95)', zIndex: 400,
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
