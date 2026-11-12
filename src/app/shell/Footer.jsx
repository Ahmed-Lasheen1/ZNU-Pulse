import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { getPulseTheme, pulseFonts, ON_BACKGROUND } from '@/shared/theme/premiumTheme'
import { glassHoverTint } from '@/shared/theme/liquidGlass'
import { HOME_ENTRANCE_END } from '@/shared/theme/pulseMotion'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
import { WhatsAppIcon } from '@/shared/icons/tool-icons'

const WHATSAPP_URL = 'https://wa.me/qr/AFP6XCVC2BJHO1'

const HIDDEN = { opacity: 0, y: 20 }
const VISIBLE = { opacity: 1, y: 0 }

// Site footer: wordmark, credit, contact and back-to-top buttons; colors follow the current color mode.
export default function Footer({ dark, animate = false }) {
  const pt = getPulseTheme(dark)
  const hoverTint = glassHoverTint(dark)
  const year = new Date().getFullYear()

  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const [armed, setArmed] = useState(animate)
  const [released, setReleased] = useState(!animate)

  // Arms the entrance animation when Home asks for it.
  useEffect(() => {
    if (animate) setArmed(true)
  }, [animate])

  // Holds the footer back until Home's own entrance has finished.
  useLayoutEffect(() => {
    if (!armed) return
    setReleased(false)
    const t = setTimeout(() => setReleased(true), HOME_ENTRANCE_END * 1000)
    return () => clearTimeout(t)
  }, [armed])

  const show = !armed || (released && inView)

  // Scrolls back to the top of the page.
  function backToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <motion.footer
      ref={ref}
      initial={armed ? HIDDEN : false}
      animate={show ? VISIBLE : HIDDEN}
      transition={{ duration: 0.7 }}
      style={{
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        borderTop: `1px solid ${pt.border}`,
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
          background: `linear-gradient(135deg, ${ON_BACKGROUND.muted}, ${pt.cobalt}55)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          opacity: 0.55,
        }}>
          ZNU PULSE
        </div>
      </div>

      <div className="pulse-wide" style={{ padding: '0 20px' }}>
        <div className="site-footer-legal">
          <span style={{ color: ON_BACKGROUND.secondary, fontSize: 13, fontWeight: 600 }}>
            Designed & built by Ahmed Lasheen
          </span>

          <div style={{ marginTop: 2 }}>
            <PulseGlassRow dark={dark} radius={999} hoverTint={hoverTint}>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 14px', fontSize: 12, fontWeight: 700,
                  color: ON_BACKGROUND.secondary, textDecoration: 'none',
                }}
              >
                <WhatsAppIcon color={ON_BACKGROUND.secondary} size={14} />
                Contact us
              </a>
            </PulseGlassRow>
          </div>

          <div style={{ marginTop: 4 }}>
            <PulseGlassRow dark={dark} radius={999} hoverTint={hoverTint} onClick={backToTop}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); backToTop() } }}>
              <div style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, color: ON_BACKGROUND.secondary }}>
                ↑ Back to top
              </div>
            </PulseGlassRow>
          </div>

          <span style={{ color: ON_BACKGROUND.muted, fontSize: 12, fontWeight: 600 }}>
            © {year} ZNU Pulse
          </span>
        </div>
      </div>
    </motion.footer>
  )
}
