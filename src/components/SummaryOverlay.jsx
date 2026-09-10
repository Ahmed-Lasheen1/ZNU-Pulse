import BackButton from './pulse/BackButton'
import Footer from './Footer'
import { previewKindFor } from '../lib/embedUrl'
import { PULSE_BG } from './pulse/PulseBackground'

const HEADER_OFFSET = 'calc(max(16px, env(safe-area-inset-top)) + 60px)'

// Full-screen "back + preview" viewer shared by every page that opens
// a summary or lesson resource — StagePage, Summaries, SubjectPage,
// LessonPage.
//
// The outer container scrolls (overflowY: auto) so the real site
// Footer can sit right after the content in normal flow — reachable
// by scrolling down, not pinned to the bottom like the header is.
export default function SummaryOverlay({ dark, onBack, url, title, fileType }) {
  const kind = previewKindFor(url, fileType)

  return (
    <div style={{
      position: 'fixed', inset: 0, height: '100dvh',
      background: PULSE_BG, zIndex: 400, overflowY: 'auto'
    }}>
      <BackButton dark={dark} onClick={onBack} />

      {kind === 'image' ? (
        <div style={{
          paddingTop: HEADER_OFFSET, height: `calc(100dvh - ${HEADER_OFFSET})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <img
            src={url}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div style={{ paddingTop: HEADER_OFFSET, height: `calc(100dvh - ${HEADER_OFFSET})` }}>
          <iframe
            src={url}
            style={{ height: '100%', width: '100%', border: 'none' }}
            title={title}
            allow={kind === 'video' ? 'autoplay; fullscreen' : undefined}
            allowFullScreen={kind === 'video' || undefined}
          />
        </div>
      )}

      <Footer dark={dark} />
    </div>
  )
}
