import BackButton from './pulse/BackButton'

// Full-screen "back + iframe" viewer shared by every page that opens
// a summary or lesson in an embedded viewer (StagePage, Summaries,
// SubjectPage, LessonPage).
//
// AUDIT FIX: same fix as MediaOverlay.jsx — dropped the old solid
// header bar (dark navy gradient, sourced from the now-retired
// theme.js) and stopped covering the real site header by using
// z-index 400 instead of 2000. Uses the shared <BackButton> component
// instead of a hand-rolled pill, so it matches every other page
// pixel-for-pixel.
//
// `100dvh` (not `100vh`) matches the same dynamic-viewport-height
// convention used elsewhere in this app (PulseBackground.tsx) to
// avoid the iOS Safari address-bar collapse/expand gap.
export default function SummaryOverlay({ dark, onBack, url, title }) {
  return (
    <div style={{ position: 'fixed', inset: 0, height: '100dvh', background: '#000', zIndex: 400 }}>
      <BackButton dark={dark} onClick={onBack} />
      <iframe src={url} style={{ height: '100%', width: '100%', border: 'none' }} title={title} />
    </div>
  )
}
