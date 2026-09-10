// src/components/MediaOverlay.jsx
import { createPortal } from 'react-dom'
import { previewKindFor } from '../lib/embedUrl'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'
import { getPulseTheme, pulseFonts } from '../premiumTheme'

const OVERLAY_Z = 2100

export default function MediaOverlay({ dark, onClose, src, title, fileType, allow, allowFullScreen }) {
  const pt = getPulseTheme(dark)
  const kind = previewKindFor(src, fileType)
  useBodyScrollLock(true)

  // AUDIT FIX: rendered through a portal into document.body instead
  // of in place. Every call site renders this inline inside a
  // `pulse-wide` div that has `position: relative; z-index: 1` —
  // which establishes its own stacking context. A `position: fixed`
  // descendant of a stacking-context-creating ancestor is NOT
  // compared globally against other fixed elements on the page; it's
  // scoped to that ancestor's stacking level. So this overlay's own
  // zIndex:2100 was only ever being weighed against sibling content
  // inside that zIndex:1 wrapper — not against the site header
  // (rendered separately by App.jsx at zIndex:500) — and since the
  // wrapper's own level (1) is less than the header's (500), the
  // header painted on top of this overlay instead of being covered by
  // it. SummaryOverlay never hit this because every one of its call
  // sites does an early `return` that replaces the whole page's
  // output, so it's never nested inside that wrapper to begin with.
  // A portaled node sits directly under <body>, outside any
  // ancestor's stacking context, so its zIndex now competes globally
  // exactly like SummaryOverlay's does. Same fix ModuleSelect.tsx
  // already uses for its dropdown panel.
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, height: '100dvh',
      background: pt.canvas, zIndex: OVERLAY_Z, overflowY: 'auto'
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 'max(14px, env(safe-area-inset-top))', left: 16,
          zIndex: 20,
          background: dark ? 'rgba(8,16,32,0.65)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${pt.border}`, borderRadius: 999,
          cursor: 'pointer',
          color: pt.text, fontFamily: pulseFonts.body, fontWeight: 700,
          fontSize: 14, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6
        }}
      >← Back</button>

      {kind === 'image' ? (
        <div style={{
          minHeight: '100dvh', padding: '80px 20px 24px', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <img
            src={src}
            alt={title}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div style={{ height: '100dvh' }}>
          <iframe
            src={src}
            style={{ height: '100%', width: '100%', border: 'none', display: 'block' }}
            title={title}
            allow={allow ?? (kind === 'video' ? 'autoplay; fullscreen' : undefined)}
            allowFullScreen={allowFullScreen ?? (kind === 'video' || undefined)}
          />
        </div>
      )}
    </div>,
    document.body
  )
}
