// src/components/ui/theme-switch.tsx
'use client'

import { Sun, Moon } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { getPulseTheme } from '../../premiumTheme'

interface Particle {
  id: number
  delay: number
  duration: number
}

interface ThemeSwitchProps {
  dark: boolean
  onToggle: () => void
  scale?: number
  stretchX?: number
}

export default function ThemeSwitch({ dark, onToggle, scale = 1, stretchX = 1 }: ThemeSwitchProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const isDark = dark
  const pt = getPulseTheme(dark)

  const BASE_W = 104
  const BASE_H = 64
  const TRACK_PADDING = 6
  // Sized off the track's own height (minus padding) instead of a flat
  // 44 — a hardcoded thumb size stayed fixed no matter how tall/short
  // the track rendered, which is what made it look like a small dot
  // stuck near the edge of a wider/shorter pill. Now it always fills
  // the track top-to-bottom, at any scale.
  const THUMB_SIZE = BASE_H - TRACK_PADDING * 2

  // stretchX widens the track itself (a real width) instead of a
  // non-uniform transform — a non-uniform scale(scaleX, scaleY) is
  // what previously squashed the round thumb into an oval. The thumb
  // keeps a size derived from BASE_H, so border-radius:999 always
  // renders it as a true circle, and the track's own border-radius:999
  // auto-rounds correctly at any width (a pill shape, not a distorted
  // ellipse).
  const trackW = BASE_W * stretchX
  const thumbTravel = trackW - THUMB_SIZE - TRACK_PADDING * 2

  function generateParticles() {
    const newParticles: Particle[] = []
    const particleCount = 3
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({ id: i, delay: i * 0.1, duration: 0.6 + i * 0.1 })
    }
    setParticles(newParticles)
    setIsAnimating(true)
    setTimeout(() => { setIsAnimating(false); setParticles([]) }, 1000)
  }

  function handleToggle() {
    generateParticles()
    onToggle()
  }

  return (
    <div style={{
      width: trackW * scale, height: BASE_H * scale,
      position: 'relative', display: 'inline-block'
    }}>
      {/* Only uniform `scale` goes through transform now — scaling
          both axes by the same factor never distorts a circle,
          unlike the old scale(scaleX, scaleY). */}
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="grain-light">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={4} result="noise" />
              <feColorMatrix in="noise" type="saturate" values="0" result="desaturatedNoise" />
              <feComponentTransfer in="desaturatedNoise" result="lightGrain">
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feBlend in="SourceGraphic" in2="lightGrain" mode="overlay" />
            </filter>
            <filter id="grain-dark">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={4} result="noise" />
              <feColorMatrix in="noise" type="saturate" values="0" result="desaturatedNoise" />
              <feComponentTransfer in="desaturatedNoise" result="darkGrain">
                <feFuncA type="linear" slope="0.5" />
              </feComponentTransfer>
              <feBlend in="SourceGraphic" in2="darkGrain" mode="overlay" />
            </filter>
          </defs>
        </svg>

        <motion.button
          onClick={handleToggle}
          style={{
            position: 'relative',
            display: 'flex', height: BASE_H, width: trackW, alignItems: 'center',
            borderRadius: 999, padding: TRACK_PADDING,
            background: isDark
              ? `radial-gradient(ellipse at top left, ${pt.surfaceRaised} 0%, ${pt.surfaceFlat} 50%, ${pt.canvas} 100%)`
              : `radial-gradient(ellipse at top left, #ffffff 0%, #ffffff 45%, ${pt.surfaceFlat} 100%)`,
            boxShadow: isDark
              ? `inset 3px 3px 8px rgba(0,0,0,0.5), inset -3px -3px 8px rgba(90,120,165,0.35), inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(90,120,165,0.3), 0 2px 4px rgba(0,0,0,0.3), 0 8px 16px rgba(0,0,0,0.25), 0 16px 32px rgba(0,0,0,0.18)`
              : `inset 3px 3px 8px rgba(175,192,214,0.35), inset -3px -3px 8px rgba(255,255,255,1), inset 0 2px 4px rgba(175,192,214,0.3), inset 0 -2px 4px rgba(255,255,255,1), 0 2px 4px rgba(0,0,0,0.06), 0 8px 16px rgba(0,0,0,0.05), 0 16px 32px rgba(0,0,0,0.04)`,
            border: `2px solid ${pt.border}`,
            outline: 'none', cursor: 'pointer',
          }}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          role="switch"
          aria-checked={isDark}
          whileTap={{ scale: 0.98 }}
        >
          <div style={{
            position: 'absolute', inset: 3, borderRadius: 999, pointerEvents: 'none',
            boxShadow: isDark
              ? 'inset 0 2px 5px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(90,120,165,0.25)'
              : 'inset 0 2px 5px rgba(175,192,214,0.3), inset 0 -1px 2px rgba(255,255,255,0.8)',
          }} />

          <div style={{
            position: 'absolute', inset: 0, borderRadius: 999, pointerEvents: 'none',
            background: isDark
              ? `radial-gradient(ellipse at top, rgba(90,120,165,0.12) 0%, transparent 50%), linear-gradient(to bottom, rgba(90,120,165,0.15) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.15) 100%)`
              : `radial-gradient(ellipse at top, rgba(255,255,255,0.8) 0%, transparent 50%), linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, transparent 30%, transparent 70%, rgba(175,192,214,0.12) 100%)`,
            mixBlendMode: 'overlay',
          }} />

          <div style={{
            position: 'absolute', inset: 0, borderRadius: 999, pointerEvents: 'none',
            boxShadow: isDark ? 'inset 0 0 12px rgba(0,0,0,0.3)' : 'inset 0 0 12px rgba(175,192,214,0.15)',
          }} />

          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 16px'
          }}>
            <Sun size={20} color={isDark ? pt.faint : pt.amber} />
            <Moon size={20} color={isDark ? pt.faint : pt.sub} />
          </div>

          <motion.div
            style={{
              position: 'relative', zIndex: 1,
              display: 'flex', height: THUMB_SIZE, width: THUMB_SIZE, alignItems: 'center', justifyContent: 'center',
              borderRadius: 999, overflow: 'hidden',
              background: isDark
                ? `linear-gradient(145deg, #7fb0ff 0%, ${pt.cobalt} 55%, #2a5cd8 100%)`
                : `linear-gradient(145deg, #ffffff 0%, #fefefe 50%, ${pt.surfaceFlat} 100%)`,
              boxShadow: isDark
                ? `inset 2px 2px 4px rgba(255,255,255,0.35), inset -2px -2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(255,255,255,0.15), 0 6px 20px rgba(76,134,255,0.35), 0 3px 8px rgba(0,0,0,0.3)`
                : `inset 2px 2px 4px rgba(199,211,227,0.3), inset -2px -2px 4px rgba(255,255,255,1), inset 0 1px 2px rgba(255,255,255,1), 0 1px 2px rgba(255,255,255,1), 0 8px 32px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)`,
              border: isDark ? '2px solid rgba(255,255,255,0.4)' : '2px solid rgba(255,255,255,0.9)',
            }}
            animate={{ x: isDark ? thumbTravel : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 999, pointerEvents: 'none',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.45) 0%, transparent 40%, rgba(0,0,0,0.06) 100%)',
              mixBlendMode: 'overlay',
            }} />

            {isAnimating && particles.map((particle) => (
              <div key={particle.id} style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
              }}>
                <motion.div
                  style={{
                    position: 'absolute', borderRadius: 999,
                    width: 10, height: 10,
                    background: isDark
                      ? `radial-gradient(circle, #7fb0ff80 0%, #7fb0ff00 70%)`
                      : `radial-gradient(circle, ${pt.amber}b3 0%, ${pt.amber}00 70%)`,
                    mixBlendMode: 'normal',
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: isDark ? 6 : 8, opacity: [0, 1, 0] }}
                  transition={{ duration: isDark ? 0.5 : particle.duration, delay: particle.delay, ease: 'easeOut' }}
                >
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 999, opacity: 0.4,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    mixBlendMode: 'overlay',
                  }} />
                </motion.div>
              </div>
            ))}

            <div style={{ position: 'relative', zIndex: 1 }}>
              {isDark ? <Moon size={20} color="#fff" /> : <Sun size={20} color={pt.amber} />}
            </div>
          </motion.div>
        </motion.button>
      </div>
    </div>
  )
}
