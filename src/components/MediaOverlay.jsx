import BackButton from './pulse/BackButton'
import Footer from './Footer'
import { previewKindFor } from '../lib/embedUrl'
import { PULSE_BG } from './pulse/PulseBackground'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'

const HEADER_OFFSET = 'calc(max(16px, env(safe-area-inset-top)) + 60px)'
const OVERLAY_Z = 2100

export default function MediaOverlay({ dark, onClose, src, title, fileType, allow, allowFullScreen }) {
  const kind = previewKindFor(src, fileType)
  useBodyScrollLock(true)

  return (
    <div style={{
      position: 'fixed', inset: 0, height: '100dvh',
      background: PULSE_BG, zIndex: OVERLAY_Z, overflowY: 'auto'
    }}>
      <BackButton dark={dark} onClick={onClose} />
      {/* ...unchanged... */}
      <Footer dark={dark} />
    </div>
  )
}
