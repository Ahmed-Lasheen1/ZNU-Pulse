import BackButton, { BACK_BUTTON_CLEARANCE } from './pulse/BackButton'

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
// AUDIT FIX: BackButton is `position: fixed` and doesn't occupy any
// space in this layout on its own, so the iframe used to start flush
// at the top of the overlay and the button floated on top of whatever
// the summary rendered underneath it. Switched this wrapper to a flex
// column and added a spacer reserving BackButton's own on-screen
// footprint (BACK_BUTTON_CLEARANCE) above the iframe, so the summary's
// content always starts below the button instead of being covered by
// it.
//
// `100dvh` (not `100vh`) matches the same dynamic-viewport-height
// convention used elsewhere in this app (PulseBackground.tsx) to
// avoid the iOS Safari address-bar collapse/expand gap.
export default function SummaryOverlay({ dark, onBack, url, title }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, height: '100dvh', background: '#000', zIndex: 400,
      display: 'flex', flexDirection: 'column'
    }}>
      <BackButton dark={dark} onClick={onBack} />
      <div style={{ height: BACK_BUTTON_CLEARANCE, flexShrink: 0 }} />
      <iframe src={url} style={{ flex: 1, width: '100%', border: 'none' }} title={title} />
    </div>
  )
}
