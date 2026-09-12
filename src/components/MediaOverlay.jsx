// src/components/MediaOverlay.jsx
import FullscreenViewer from './FullscreenViewer'

// Full-screen file/video viewer — thin adapter over the shared
// FullscreenViewer (see SummaryOverlay.jsx for the other consumer).
export default function MediaOverlay({ dark, onClose, src, title, fileType, allow, allowFullScreen }) {
  return (
    <FullscreenViewer
      dark={dark} onClose={onClose} src={src} title={title} fileType={fileType}
      allow={allow} allowFullScreen={allowFullScreen}
    />
  )
}
