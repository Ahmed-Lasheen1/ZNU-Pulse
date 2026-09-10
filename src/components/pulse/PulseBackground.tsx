import { useEffect, useRef, useState } from 'react'

// Full-bleed background gradient shared by every ZNU Pulse page —
// extracted verbatim from Home's original LOGO_BG constant so every
// page uses the exact same gradient rather than redefining it.
// 100dvh (not just inset:0) so iOS Safari's collapsing/expanding
// address bar doesn't leave a gap at the bottom — same reasoning as
// the original Home implementation.
export const PULSE_BG = [
  'linear-gradient(180deg,',
  '#a6d2ef 0%,',
  '#97bcd7 15%,',
  '#81a6c3 30%,',
  '#6c8fad 45%,',
  '#497194 60%,',
  '#274e79 75%,',
  '#042a59 90%,',
  '#010c4a 100%)',
].join(' ')

// Real star colors (white / blue-white / pale gold / pale blue) —
// the same palette used by reference twinkling-starfield
// implementations, not colors pulled from the app's own gradient.
// Kept deliberately light/bright across the board so every star
// reads clearly as "a star," rather than trying to camouflage itself
// against whichever part of the gradient it happens to sit over.
const STAR_COLORS = [
  '248, 247, 255', // #a6d2ef — pale blue 
  '155, 176, 255', // #5fd9ff — cyan ECG
  '255, 204, 111', // #5fd9ff — cyan ECG
  '202, 215, 255', // #a6d2ef — pale blue
]

// Ambient brightness range a star idles within while twinkling —
// never fully off (unlike a spawn/despawn cycle), just a slow,
// gentle pulse between "dim" and "fully lit."
const TWINKLE_MIN = 0
const TWINKLE_MAX = 1

// Water-like response tuning while the cursor is actively within
// range: PUSH_FORCE is small (a nudge, not a yank) and FRICTION_IN is
// close to 1 so a push keeps carrying for a bit — heavy, viscous
// motion. The moment a particle falls outside the cursor's influence,
// FRICTION_OUT (much lower) brings it to a stop within a few frames
// instead of letting it keep coasting — particles only ever move
// while the cursor is actually near them.
const INFLUENCE_RADIUS = 150
const PUSH_FORCE = 0.28
const FRICTION_IN = 0.985
const FRICTION_OUT = 0.8
const MAX_SPEED = 0.8
const GLOW_EASE = 0.035
// Soft margin kept off the true edge — a particle nudged toward the
// edge of the screen eases to a stop here instead of vanishing off
// the visible area or wrapping to the opposite side.
const EDGE_MARGIN = 10

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  colorRgb: string
  twinklePhase: number
  twinkleSpeed: number
  glow: number // eased, rendered brightness — chases its target
}

// Stars are permanent once created — no birth/death timers, no
// fade-in/fade-out lifecycle. Each one just twinkles forever in
// place (a slow per-star sine wave, offset by its own random phase
// and speed so stars never pulse in lockstep), and only the cursor
// ever nudges its position.
function makeParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: 0,
    vy: 0,
    radius: 1 + Math.random() * 1.6,
    colorRgb: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.0004 + Math.random() * 0.0009,
    glow: TWINKLE_MIN,
  }
}

// Sparse starfield — a handful of persistent, twinkling points (real
// star colors, see STAR_COLORS above) that never disappear and never
// relocate on their own. The cursor is the only thing that ever moves
// one: coming near it eases its brightness up to fully lit (overriding
// the twinkle) and gives it a gentle, water-like push — small force,
// heavy momentum while the cursor stays close — but the instant the
// cursor moves away, that particle settles back to a stop within a
// couple of frames and resumes twinkling normally. Purely decorative:
// skipped entirely under prefers-reduced-motion, same convention
// EcgHero already uses for its beam.
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    function resize() {
      width = window.innerWidth
      height = window.innerHeight
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      canvas!.style.width = `${width}px`
      canvas!.style.height = `${height}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // Scales gently with screen size but stays capped in the 25-50
    // range so this reads as "a field of stars," not a snowstorm.
    const count = Math.max(250, Math.min(500, Math.round((width * height) / 32000)))
    const particles: Particle[] = Array.from({ length: count }, () => makeParticle(width, height))

    let mouseX = -9999
    let mouseY = -9999
    let hasMouse = false
    function onPointerMove(e: PointerEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
      hasMouse = true
    }
    function onPointerLeave() {
      hasMouse = false
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerleave', onPointerLeave)

    let rafId: number
    function frame() {
      const now = performance.now()
      ctx!.clearRect(0, 0, width, height)
      // Normal (non-additive) blending — an earlier 'lighter' mode
      // brightened each dot's anti-aliased edge pixels into a soft
      // halo. Plain source-over keeps every dot a crisp, flat circle.
      ctx!.globalCompositeOperation = 'source-over'

      for (const p of particles) {
        // Gentle sine-wave twinkle — always somewhere between
        // TWINKLE_MIN and TWINKLE_MAX, never fully off.
        const twinkle = TWINKLE_MIN + (TWINKLE_MAX - TWINKLE_MIN) *
          (0.5 + 0.5 * Math.sin(now * p.twinkleSpeed + p.twinklePhase))

        let targetGlow = twinkle
        let influenced = false

        if (hasMouse) {
          const dx = p.x - mouseX
          const dy = p.y - mouseY
          const dist = Math.hypot(dx, dy)
          if (dist < INFLUENCE_RADIUS && dist > 0.01) {
            influenced = true
            const pull = 1 - dist / INFLUENCE_RADIUS
            // Gentle, weighted push — small force, so it takes a
            // moment to get going, exactly like nudging something
            // floating in water rather than flicking it.
            const force = pull * pull * PUSH_FORCE
            p.vx += (dx / dist) * force
            p.vy += (dy / dist) * force
            targetGlow = 1
          }
        }

        // Ease brightness toward its target instead of snapping.
        p.glow += (targetGlow - p.glow) * GLOW_EASE

        // While influenced: heavy, viscous motion (velocity decays
        // very slowly, capped at MAX_SPEED so it never reads as
        // fast). The moment the cursor is no longer close, a much
        // stronger friction brings the particle to rest within a few
        // frames — it never keeps drifting on its own.
        const speed = Math.hypot(p.vx, p.vy)
        if (speed > MAX_SPEED) {
          const scale = MAX_SPEED / speed
          p.vx *= scale
          p.vy *= scale
        }
        p.x += p.vx
        p.y += p.vy
        p.vx *= influenced ? FRICTION_IN : FRICTION_OUT
        p.vy *= influenced ? FRICTION_IN : FRICTION_OUT
        if (!influenced && Math.hypot(p.vx, p.vy) < 0.01) { p.vx = 0; p.vy = 0 }

        // Clamp to the visible area instead of wrapping — a particle
        // nudged toward an edge eases to a stop there, it never
        // teleports to the opposite side.
        if (p.x < EDGE_MARGIN) { p.x = EDGE_MARGIN; p.vx = 0 }
        if (p.x > width - EDGE_MARGIN) { p.x = width - EDGE_MARGIN; p.vx = 0 }
        if (p.y < EDGE_MARGIN) { p.y = EDGE_MARGIN; p.vy = 0 }
        if (p.y > height - EDGE_MARGIN) { p.y = height - EDGE_MARGIN; p.vy = 0 }

        ctx!.beginPath()
        ctx!.fillStyle = `rgba(${p.colorRgb}, ${p.glow})`
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx!.fill()
      }

      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [reducedMotion])

  if (reducedMotion) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        height: '100dvh',
        zIndex: 0, pointerEvents: 'none',
      }}
    />
  )
}

export default function PulseBackground() {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          height: '100dvh',
          zIndex: 0, pointerEvents: 'none',
          background: PULSE_BG,
        }}
      />
      <ParticleField />
    </>
  )
}
