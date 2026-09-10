import BackButton from './pulse/BackButton'
import { previewKindFor } from '../lib/embedUrl'
import { PULSE_BG } from './pulse/PulseBackground'

// Full-screen "back + preview" viewer shared by every page that opens
// a summary or lesson resource — StagePage, Summaries, SubjectPage,
// LessonPage.
//
// Content type is detected via previewKindFor() in lib/embedUrl.js:
// `fileType` is an optional hint ('pdf' | 'html' | 'image' | 'video')
// a caller can pass when it already knows the kind — without a hint,
// it's inferred from the URL itself (image extension -> image,
// YouTube link -> video, everything else -> plain iframe).
//
// Background uses the same PULSE_BG gradient every other page sits
// on, instead of solid black — so the light top zone shows behind the
// fixed site header, and the gradient naturally darkens toward the
// bottom to match the rest of the app.
//
// Iframe/image content is pushed down below the header's real height
// (headerOffset) so any toolbar the embedded content shows near its
// own top edge — e.g. Google Drive's preview toolbar — isn't
// physically covered by the header sitting above it.
export default function SummaryOverlay({ dark, onBack, url, title, fileType }) {
  const kind = previewKindFor(url, fileType)
  const headerOffset = 'calc(max(16px, env(safe-area-inset-top)) + 60px)'

  return (
    <div style={{ position: 'fixed', inset: 0, height: '100dvh', background: PULSE_BG, zIndex: 400 }}>
      <BackButton dark={dark} onClick={onBack} />

      {kind === 'image' ? (
        <div style={{
          height: `calc(100% - ${headerOffset})`, marginTop: headerOffset,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto'
        }}>
          <img
            src={url}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div style={{ height: `calc(100% - ${headerOffset})`, marginTop: headerOffset }}>
          <iframe
            src={url}
            style={{ height: '100%', width: '100%', border: 'none' }}
            title={title}
            allow={kind === 'video' ? 'autoplay; fullscreen' : undefined}
            allowFullScreen={kind === 'video' || undefined}
          />
        </div>
      )}
    </div>
  )
}
