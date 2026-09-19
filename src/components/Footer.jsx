// src/components/Footer.jsx
import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { getPulseTheme, pulseFonts, ON_GRADIENT_BOTTOM } from '../premiumTheme'
import { HOME_ENTRANCE_END } from '../lib/pulseMotion'
import PulseGlassRow from './pulse/PulseGlassRow'
import { WhatsAppIcon } from './ui/tool-icons'

const DIVIDER_COLOR = getPulseTheme(true).border
const HOVER_TINT = 'rgba(255,255,255,0.08)'
const WHATSAPP_URL = 'https://wa.me/qr/AFP6XCVC2BJHO1'

const HIDDEN = { opacity: 0, y: 20 }
const VISIBLE = { opacity: 1, y: 0 }

// `animate` gates whether this plays an entrance at all (Home, first
// visit this session only — same rule as every other animated piece
// of Home; every other page, or a repeat Home visit, just renders
// straight into place with no motion, as before).
//
// The footer sits below the fold, so it reveals when scrolled into
// view (`useInView`, once) — same 20px rise / 0.7s as Home's own
// section-title reveals. BUT it must also be the LAST thing Home
// reveals: on tall screens the footer is already in view at load, and
// a bare whileInView fired it at t=0, before Home's staggered cascade
// had even begun. So it now needs BOTH conditions — in view AND
// HOME_ENTRANCE_END seconds elapsed (see lib/pulseMotion.js). Scroll
// to it early and it simply waits for the cascade to finish; scroll
// to it later and it plays instantly on arrival.
export default function Footer({ dark, animate = false }) {
  const pt = getPulseTheme(dark)
  const year = new Date().getFullYear()

  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const [released, setReleased] = useState(!animate)

  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setReleased(true), HOME_ENTRANCE_END * 1000)
    return () => clearTimeout(t)
  }, [animate])

  const show = !animate || (released && inView)

  function backToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <motion.footer
      ref={ref}
      initial={animate ? HIDDEN : false}
      animate={show ? VISIBLE : HIDDEN}
      transition={{ duration: 0.7 }}
      style={{
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        borderTop: `1px solid ${DIVIDER_COLOR}`,
        fontFamily: pulseFonts.body,
      }}
    >
      <style>{`
        .site-footer-wordmark {
          font-size: clamp(36px, 10vw, 96px);
        }
        .site-footer-legal {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; padding: 18px 0 22px; text-align: center;
        }
      `}</style>

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
            Designed & built by Ahmed Lasheen
          </span>

          <div style={{ marginTop: 2 }}>
            <PulseGlassRow dark={true} radius={999} hoverTint={HOVER_TINT}>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 14px', fontSize: 12, fontWeight: 700,
                  color: ON_GRADIENT_BOTTOM.secondary, textDecoration: 'none',
                }}
              >
                <WhatsAppIcon color={ON_GRADIENT_BOTTOM.secondary} size={14} />
                Contact us
              </a>
            </PulseGlassRow>
          </div>

          <div style={{ marginTop: 4 }}>
            <PulseGlassRow dark={true} radius={999} hoverTint={HOVER_TINT} onClick={backToTop}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); backToTop() } }}>
              <div style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, color: ON_GRADIENT_BOTTOM.secondary }}>
                ↑ Back to top
              </div>
            </PulseGlassRow>
          </div>

          <span style={{ color: ON_GRADIENT_BOTTOM.muted, fontSize: 12, fontWeight: 600 }}>
            © {year} ZNU Pulse
          </span>
        </div>
      </div>
    </motion.footer>
  )
}
