// src/components/SummaryOverlay.jsx
import FullscreenViewer from './FullscreenViewer'

// Full-screen summary viewer — thin adapter over the shared
// FullscreenViewer (see MediaOverlay.jsx for the other consumer).
export default function SummaryOverlay({ dark, onBack, url, title, fileType }) {
  return <FullscreenViewer dark={dark} onClose={onBack} src={url} title={title} fileType={fileType} />
}
