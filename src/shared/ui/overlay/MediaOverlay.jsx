import FullscreenViewer from '@/shared/ui/overlay/FullscreenViewer'

// Full-screen file/video viewer — thin adapter over the shared
// FullscreenViewer (see SummaryOverlay.jsx for the other consumer).
// `allow` and `allowFullScreen` are optional; FullscreenViewer picks defaults for video.
/**
 * @param {{
 *   dark: boolean,
 *   onClose: () => void,
 *   src: string,
 *   title?: string,
 *   fileType?: string,
 *   allow?: string,
 *   allowFullScreen?: boolean,
 * }} props
 */
export default function MediaOverlay({ dark, onClose, src, title, fileType, allow, allowFullScreen }) {
  return (
    <FullscreenViewer
      dark={dark} onClose={onClose} src={src} title={title} fileType={fileType}
      allow={allow} allowFullScreen={allowFullScreen}
    />
  )
}
