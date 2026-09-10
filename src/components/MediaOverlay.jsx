import BackButton from './pulse/BackButton'
import { previewKindFor } from '../lib/embedUrl'
import { PULSE_BG } from './pulse/PulseBackground'

const HEADER_OFFSET = 'calc(max(16px, env(safe-area-inset-top)) + 60px)'
const FOOTER_HEIGHT = 'calc(max(16px, env(safe-area-inset-bottom)) + 44px)'

export default function MediaOverlay({ dark, onClose, src, title, fileType, allow, allowFullScreen }) {
  const kind = previewKindFor(src, fileType)

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: PULSE_BG, zIndex: 400
    }}>
      <BackButton dark={dark} onClick={onClose} />

      {kind === 'image' ? (
        <div style={{
          position: 'absolute', top: HEADER_OFFSET, left: 0, right: 0, bottom: FOOTER_HEIGHT,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto'
        }}>
          <img
            src={src}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div style={{ position: 'absolute', top: HEADER_OFFSET, left: 0, right: 0, bottom: FOOTER_HEIGHT }}>
          <iframe
            src={src}
            style={{ height: '100%', width: '100%', border: 'none' }}
            title={title}
            allow={allow ?? (kind === 'video' ? 'autoplay; fullscreen' : undefined)}
            allowFullScreen={allowFullScreen ?? (kind === 'video' || undefined)}
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
