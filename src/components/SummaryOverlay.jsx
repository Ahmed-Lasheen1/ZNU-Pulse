import BackButton from './pulse/BackButton'
import { previewKindFor } from '../lib/embedUrl'

// Full-screen "back + preview" viewer shared by every page that opens
// a summary or lesson resource — StagePage, Summaries, SubjectPage,
// LessonPage.
//
// Now content-type aware: `fileType` is an optional hint ('pdf' |
// 'html' | 'video' | 'image') a caller can pass when it already knows
// what kind of resource this is (e.g. a stored file_type column).
// Without a hint, the kind is inferred from the URL itself (YouTube
// link -> video, image extension -> image, everything else -> plain
// iframe) via previewKindFor() in lib/embedUrl.js — so existing
// callers that only ever passed `url` keep working unchanged, they
// just also now get automatic image support for free.
export default function SummaryOverlay({ dark, onBack, url, title, fileType }) {
  const kind = previewKindFor(url, fileType)

  return (
    <div style={{ position: 'fixed', inset: 0, height: '100dvh', background: '#000', zIndex: 400 }}>
      <BackButton dark={dark} onClick={onBack} />

      {kind === 'image' ? (
        <div style={{
          height: '100%', width: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', overflow: 'auto'
        }}>
          <img
            src={url}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <iframe
          src={url}
          style={{ height: '100%', width: '100%', border: 'none' }}
          title={title}
          allow={kind === 'video' ? 'autoplay; fullscreen' : undefined}
          allowFullScreen={kind === 'video' || undefined}
        />
      )}
    </div>
  )
}
