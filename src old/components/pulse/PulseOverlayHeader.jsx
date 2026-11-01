import { motion } from 'framer-motion'
import NavMenu from '../NavMenu'
import PulseBrand from './PulseBrand'
import { useHomeEntrance } from '../../contexts'
import { LOGO_DELAY, BRAND_WORDS_START, BRAND_WORD_STAGGER, BRAND_TAGLINE_DELAY } from '../../lib/pulseMotion'

const BRAND_ANIMATION = {
  logoDelay: LOGO_DELAY,
  wordsStart: BRAND_WORDS_START,
  wordStagger: BRAND_WORD_STAGGER,
  taglineDelay: BRAND_TAGLINE_DELAY,
}

// The one site header, mounted once in App.jsx on every page (Home included).
// The brand and menu animate in only when `entranceRun` flips to 1 (first Home
// visit per page load); it is used as a key so they re-mount exactly then.
export default function PulseOverlayHeader({ dark, toggleTheme }) {
  const { entranceRun } = useHomeEntrance()
  const playEntrance = entranceRun > 0

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      zIndex: 500, pointerEvents: 'none'
    }}>
      <div className="pulse-wide" style={{
        // Clears the notch (viewport-fit=cover); 0px where there is none.
        paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        paddingBottom: 16,
        pointerEvents: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <PulseBrand
            key={`brand-${entranceRun}`}
            dark={dark}
            instant={!playEntrance}
            animation={BRAND_ANIMATION}
          />

          <motion.div
            key={`nav-${entranceRun}`}
            initial={playEntrance ? { opacity: 0, x: 20 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: LOGO_DELAY }}
          >
            <NavMenu dark={dark} toggleTheme={toggleTheme} align="right" />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
