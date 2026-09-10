import BackButton from './pulse/BackButton'
import { previewKindFor } from '../lib/embedUrl'
import { PULSE_BG } from './pulse/PulseBackground'

const HEADER_OFFSET = 'calc(max(16px, env(safe-area-inset-top)) + 60px)'
const FOOTER_HEIGHT = 'calc(max(16px, env(safe-area-inset-bottom)) + 44px)'

export default function SummaryOverlay({ dark, onBack, url, title, fileType }) {
  const kind = previewKindFor(url, fileType)

  return (
    <div style={{ position: 'fixed', inset: 0, height: '100dvh', background: PULSE_BG, zIndex: 400 }}>
      <BackButton dark={dark} onClick={onBack} />

      {kind === 'image' ? (
        <div style={{
          position: 'absolute', top: HEADER_OFFSET, left: 0, right: 0, bottom: FOOTER_HEIGHT,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto'
        }}>
          <img
            src={url}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div style={{ position: 'absolute', top: HEADER_OFFSET, left: 0, right: 0, bottom: FOOTER_HEIGHT }}>
          <iframe
            src={url}
            style={{ height: '100%', width: '100%', border: 'none' }}
            title={title}
            allow={kind === 'video' ? 'autoplay; fullscreen' : undefined}
            allowFullScreen={kind === 'video' || undefined}
          />
        </div>
      )}

      <div aria-hidden style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: FOOTER_HEIGHT,
        background: PULSE_BG
      }} />
    </div>
  )
}
