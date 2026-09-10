// src/components/pulse/PulseBrand.tsx
import { motion } from 'framer-motion'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../../premiumTheme'

const LOGO_SRC = '/icon-192.png'

interface BrandAnimationTiming {
  logoDelay: number
  wordsStart: number
  wordStagger: number
  taglineDelay: number
}

interface PulseBrandProps {
  dark: boolean
  logoSize?: number
  fontSize?: number
  animation?: BrandAnimationTiming
  instant?: boolean
}

const brandWordItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

// Logo/name/tagline click goes through a real browser navigation
// (window.location.href), not React Router's navigate() — a full
// page reload, same as clicking a logo on any traditional website.
// Deliberate choice over SPA routing here: this is the one spot
// people expect "start over" behavior from, even though it costs the
// SPA's instant-navigation speed.
function goHome() {
  window.location.href = '/'
}
function handleBrandKeyDown(e: React.KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    goHome()
  }
}

export default function PulseBrand({ dark, logoSize = 44, fontSize = 20, animation, instant = false }: PulseBrandProps) {
  const pt = getPulseTheme(false)

  if (!animation) {
    return (
      <div
        onClick={goHome}
        onKeyDown={handleBrandKeyDown}
        role="link"
        tabIndex={0}
        aria-label="ZNU Pulse — go to home"
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      >
        <div style={{
          width: logoSize, height: logoSize, flexShrink: 0,
          borderRadius: 10, overflow: 'hidden',
          background: pt.surfaceFlat, border: `1px solid ${pt.cobaltBorder}`,
        }}>
          <img src={LOGO_SRC} alt="ZNU Pulse" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <div>
          <div style={{
            ...pulseType.sectionTitle,
            fontFamily: pulseFonts.display, fontWeight: 800, fontSize, letterSpacing: 1,
            color: ON_GRADIENT_TOP.primary, lineHeight: 1
          }}>
            ZNU <span style={{ color: pt.cobalt }}>PULSE</span>
          </div>
          <div style={{
            ...pulseType.sectionLabel,
            fontSize: 9, letterSpacing: 2.5,
            color: ON_GRADIENT_TOP.muted, marginTop: 5,
          }}>For Future Doctors</div>
        </div>
      </div>
    )
  }

  const { logoDelay, wordsStart, wordStagger, taglineDelay } = animation
  const brandWordsContainer = {
    hidden: {},
    visible: { transition: { delayChildren: wordsStart, staggerChildren: wordStagger } },
  }

  return (
    <div
      onClick={goHome}
      onKeyDown={handleBrandKeyDown}
      role="link"
      tabIndex={0}
      aria-label="ZNU Pulse — go to home"
      style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
    >
      <motion.div
        initial={instant ? false : { opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: logoDelay }}
        style={{
          width: logoSize, height: logoSize, flexShrink: 0,
          borderRadius: 12, overflow: 'hidden',
          background: pt.surfaceFlat, border: `1px solid ${pt.cobaltBorder}`,
        }}
      >
        <img src={LOGO_SRC} alt="ZNU Pulse" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </motion.div>

      <div>
        <motion.div
          initial={instant ? false : 'hidden'}
          animate="visible"
          variants={brandWordsContainer}
          style={{
            ...pulseType.sectionTitle,
            fontFamily: pulseFonts.display, fontWeight: 800, fontSize, letterSpacing: 1.2,
            color: ON_GRADIENT_TOP.primary, lineHeight: 1
          }}
        >
          <motion.span variants={brandWordItem} style={{ display: 'inline-block' }}>ZNU</motion.span>
          {' '}
          <motion.span variants={brandWordItem} style={{ display: 'inline-block', color: pt.cobalt }}>PULSE</motion.span>
        </motion.div>
        <motion.div
          initial={instant ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: taglineDelay }}
          style={{
            ...pulseType.sectionLabel,
            fontSize: 9, letterSpacing: 2.5,
            color: ON_GRADIENT_TOP.muted, marginTop: 5,
          }}
        >For Future Doctors</motion.div>
      </div>
    </div>
  )
}
