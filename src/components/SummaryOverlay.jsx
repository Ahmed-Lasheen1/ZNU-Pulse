// src/components/SummaryOverlay.jsx
import Footer from './Footer'
import { previewKindFor } from '../lib/embedUrl'
import { PULSE_BG } from './pulse/PulseBackground'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'
import { getPulseTheme, pulseFonts } from '../premiumTheme'

const OVERLAY_Z = 2100

export default function SummaryOverlay({ dark, onBack, url, title, fileType }) {
  const pt = getPulseTheme(dark)
  const kind = previewKindFor(url, fileType)
  useBodyScrollLock(true)

  return (
    <div style={{
      position: 'fixed', inset: 0, height: '100dvh',
      background: PULSE_BG, zIndex: OVERLAY_Z,
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      {/* Fixed-height header — no longer needs `sticky` since it's a
          plain flex child that never scrolls with the content below it. */}
      <div style={{
        flexShrink: 0, zIndex: 10,
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

      {/* This is the actual fix: flex:1 + minHeight:0 makes this area
          size to exactly "viewport minus header", whatever that
          happens to be on this device — instead of a hardcoded 60/80dvh
          that either left a gap or clipped before Footer. It's the
          scroll container now, not the outer wrapper. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {kind === 'image' ? (
          <div style={{
            minHeight: '100%', padding: '24px 20px', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <img
              src={url}
              alt={title}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div style={{ height: '100%', minHeight: '60dvh' }}>
            <iframe
              src={url}
              style={{ height: '100%', width: '100%', border: 'none', display: 'block' }}
              title={title}
              allow={kind === 'video' ? 'autoplay; fullscreen' : undefined}
              allowFullScreen={kind === 'video' || undefined}
            />
          </div>
        )}

        <Footer dark={dark} />
      </div>
    </div>
  )
}
