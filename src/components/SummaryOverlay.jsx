// src/components/SummaryOverlay.jsx
import Footer from './Footer'
import { previewKindFor } from '../lib/embedUrl'
import { PULSE_BG } from './pulse/PulseBackground'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'
import { getPulseTheme, pulseFonts } from '../premiumTheme'

// Above SiteHeader (500) and NavMenu's button/panel (2000/1999) so the
// real site chrome never renders on top of a full-screen viewer.
const OVERLAY_Z = 2100

// Full-screen "back + preview" viewer shared by every page that opens
// a summary or lesson resource — StagePage, Summaries, SubjectPage,
// LessonPage.
//
// AUDIT FIX: this used to render the shared, viewport-`position:fixed`
// BackButton, whose safe-area offset math assumed the real SiteHeader
// was still visible just above it. Once the overlay was raised above
// SiteHeader (see OVERLAY_Z), BackButton lost that anchor and its
// translucent glass pill could read as invisible against the plain
// gradient. Replaced with a small `position: sticky` bar that's a
// direct child of THIS component's own scroll container — no
// viewport-relative math, no dependency on what else is on screen,
// and a background solid enough to always be legible.
//
// The outer container scrolls (overflowY: auto); Footer is the LAST
// element in normal document flow, so it only ever appears once the
// person has scrolled all the way to the bottom of the content — it
// is never sticky/fixed and never shows early.
export default function SummaryOverlay({ dark, onBack, url, title, fileType }) {
  const pt = getPulseTheme(dark)
  const kind = previewKindFor(url, fileType)
  useBodyScrollLock(true)

  return (
    <div style={{
      position: 'fixed', inset: 0, height: '100dvh',
      background: PULSE_BG, zIndex: OVERLAY_Z, overflowY: 'auto'
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center',
        padding: 'max(14px, env(safe-area-inset-top)) 20px 14px',
        background: dark ? 'rgba(8,16,32,0.65)' : 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${pt.border}`,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: pt.text, fontFamily: pulseFonts.body, fontWeight: 700,
            fontSize: 14, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6
          }}
        >← Back</button>
      </div>

      {kind === 'image' ? (
        <div style={{
          minHeight: '60dvh', padding: '24px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <img
            src={url}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '80dvh', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div style={{ height: '80dvh' }}>
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
