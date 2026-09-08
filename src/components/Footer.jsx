import { getPulseTheme, pulseFonts, ON_GRADIENT_BOTTOM } from '../premiumTheme'
import PulseGlassRow from './pulse/PulseGlassRow'

// Same reasoning as Home.tsx's FOOTER_LINE_COLOR: the footer always
// sits on the dark/lower portion of the fixed PULSE_BG gradient,
// regardless of the app's light/dark theme toggle (the gradient
// itself never changes with that toggle) — so the divider is frozen
// to the dark-mode value rather than reading a Liquid Glass token
// that would otherwise flip with the theme.
const DIVIDER_COLOR = getPulseTheme(true).border
const HOVER_TINT = 'rgba(255,255,255,0.08)'

// AUDIT FIX (per user request): every quick-nav link removed — Home,
// Schedule, Checklist, MCQ, etc. are all one tap away from the
// persistent NavMenu and already surfaced on Home itself, so
// repeating them here was pure redundancy, not navigation. This now
// follows the "Large Type" / narrow-footer pattern (big brand
// wordmark as the visual anchor + a copyright line, nothing else) —
// the right fit for a small app that doesn't need a second sitemap.
export default function Footer({ dark }) {
  const pt = getPulseTheme(dark)
  const year = new Date().getFullYear()

  function backToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer style={{
      position: 'relative',
      zIndex: 1,
      overflow: 'hidden',
      borderTop: `1px solid ${DIVIDER_COLOR}`,
      fontFamily: pulseFonts.body,
    }}>
      <style>{`
        .site-footer-wordmark {
          font-size: clamp(36px, 10vw, 96px);
        }
        .site-footer-legal {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; padding: 18px 0 22px; text-align: center;
        }
      `}</style>

      {/* Brand statement — the footer's one visual moment. Decorative
          only (aria-hidden), since the real, accessible brand name
          already lives in the site header on every page. */}
      <div aria-hidden style={{ textAlign: 'center', padding: '44px 20px 8px' }}>
        <div className="site-footer-wordmark" style={{
          fontFamily: pulseFonts.display, fontWeight: 800, letterSpacing: 2,
          lineHeight: 1, whiteSpace: 'nowrap',
          background: `linear-gradient(135deg, ${ON_GRADIENT_BOTTOM.muted}, ${pt.cobalt}55)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          opacity: 0.55,
        }}>
          ZNU PULSE
        </div>
      </div>

      <div className="pulse-wide" style={{ padding: '0 20px' }}>
        <div className="site-footer-legal">
          <span style={{ color: ON_GRADIENT_BOTTOM.secondary, fontSize: 13, fontWeight: 600 }}>
            Made with ❤️ by Ahmed Lasheen
          </span>
          <span style={{ color: ON_GRADIENT_BOTTOM.muted, fontSize: 12, fontWeight: 600 }}>
            © {year} ZNU Pulse. All rights reserved.
          </span>
          <div style={{ marginTop: 4 }}>
            <PulseGlassRow dark={true} radius={999} hoverTint={HOVER_TINT} onClick={backToTop}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); backToTop() } }}>
              <div style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, color: ON_GRADIENT_BOTTOM.secondary }}>
                ↑ Back to top
              </div>
            </PulseGlassRow>
          </div>
        </div>
      </div>
    </footer>
  )
}
