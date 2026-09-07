import BackButton from './pulse/BackButton'

// Full-screen dark overlay used for schedule images/PDFs, question-bank
// PDFs, and lecture videos (Schedule, FilesPage).
//
// AUDIT FIX: dropped the old solid header bar (dark navy gradient +
// text label + red "✕ Close" pill) left over from the pre-liquid-glass
// design, and stopped covering the real site header (it previously
// used z-index 2000, higher than the header's z-index 500, hiding it
// entirely). Now sits BELOW the header (z-index 400) so the same
// fixed brand/nav bar every other page shows stays visible, and uses
// the exact same <BackButton> component every other page uses instead
// of a one-off close button — same position, same style, same
// behavior everywhere.
export default function MediaOverlay({ dark, onClose, src, iframeTitle, allow, allowFullScreen }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.95)', zIndex: 400,
      display: 'flex', flexDirection: 'column'
    }}>
      <BackButton dark={dark} onClick={onClose} />
      <iframe src={src} style={{ flex: 1, border: 'none', width: '100%' }} title={iframeTitle} allow={allow} allowFullScreen={allowFullScreen} />
    </div>
  )
}
