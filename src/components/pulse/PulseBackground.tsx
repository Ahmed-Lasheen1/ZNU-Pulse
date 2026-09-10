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

// Particle palette — split into two sets so a particle always shows up
// AGAINST the gradient behind it instead of blending into it: PULSE_BG
// runs pale (top) to dark navy (bottom), so particles born in the top
// half use a darker tone and particles born in the bottom half use a
// lighter one. A particle's zone (and palette) is fixed at birth via
// pickParticleColor below, keyed off its own y position — and since a
// particle's x/y never change except by cursor nudging (see
// ParticleField's fade-cycle-restart logic, which always carries the
// current position forward via `at`), a particle keeps the same
// palette for its whole lifetime even across respawns, rather than
// flickering between palettes as it fades in and out in place.
const PARTICLE_PALETTE_TOP = [
  '39, 78, 121',   // #274e79 — gradient's mid-dark stop
  '4, 42, 89',     // #042a59 — gradient's near-darkest stop
  '1, 12, 74',     // #010c4a — gradient's darkest stop
]
const PARTICLE_PALETTE_BOTTOM = [
  '166, 210, 239', // #a6d2ef — gradient's palest stop
  '151, 188, 215', // ECG cyan accent
  '95, 217, 255',  // ECG cyan accent
]

function pickParticleColor(y: number, h: number) {
  const palette = y < h / 2 ? PARTICLE_PALETTE_TOP : PARTICLE_PALETTE_BOTTOM
  return palette[Math.floor(Math.random() * palette.length)]
}

// Caps how bright a particle is ever allowed to get while idly
// fading in/out — keeps the ambient field dim rather than punchy.
// Deliberately NOT applied when the cursor is actively influencing a
// particle (see the `rendered` calculation in the render loop below)
// — a particle the cursor is near should be forced fully lit, not
// capped down to this ambient ceiling.
const MAX_BRIGHTNESS = 0.75

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
  born: number
  lifeDuration: number
  fadeDuration: number
  baseOpacity: number
  glow: number // eased, rendered brightness — chases its target
}

// `x`/`y` are only randomized when a particle is first created (no
// `at` given). Every later fade-cycle restart passes its own current
// position back in via `at`, so a particle spends its entire
// lifetime — across as many fade in/out cycles as it goes through —
// in the same place (and therefore the same color zone); only the
// cursor ever moves it.
function makeParticle(w: number, h: number, now: number, initial: boolean, at?: { x: number; y: number }): Particle {
  const lifeDuration = 5000 + Math.random() * 7000 // ~5-12s fully visible cycle
  const x = at ? at.x : Math.random() * w
  const y = at ? at.y : Math.random() * h
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 1 + Math.random() * 1.6,
    colorRgb: pickParticleColor(y, h),
    // Irregular timing: staggered on first paint so particles don't
    // all appear at once, and staggered on respawn so they never
    // settle into lockstep with each other.
    born: now + (initial ? Math.random() * 9000 : 1200 + Math.random() * 6000),
    lifeDuration,
    fadeDuration: lifeDuration * (0.3 + Math.random() * 0.2),
    baseOpacity: 0,
    glow: 0,
  }
}

// Sparse, irregular ambient field — a handful of dim, multi-toned
// points (colors pulled from PULSE_BG's own gradient, see
// PARTICLE_PALETTE_TOP/BOTTOM above) that fade in and out forever in
// the SAME spot — a fade cycle ending never relocates a particle, it
// just starts the next cycle in place. The cursor is the only thing
// that ever moves one: coming near it slowly eases its brightness up
// to FULL (overriding the ambient MAX_BRIGHTNESS cap — see the
// `rendered` calculation below) and gives it a gentle, water-like
// push — small force, heavy momentum while the cursor stays close —
// but the instant the cursor moves away, that particle settles back
// to a stop within a couple of frames. Purely decorative: skipped
// entirely under prefers-reduced-motion, same convention EcgHero
// already uses for its beam.
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
    // range so this reads as "a field of embers," not a particle storm.
    const count = Math.max(25, Math.min(50, Math.round((width * height) / 32000)))
    const now0 = performance.now()
    const particles: Particle[] = Array.from({ length: count }, () => makeParticle(width, height, now0, true))

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
        if (now < p.born) continue

        const t = now - p.born
        if (t > p.lifeDuration) {
          // Restart the fade cycle in place — same x/y carried
          // forward, so this never reads as "disappeared here,
          // reappeared somewhere else," and its color stays fixed to
          // its own zone since pickParticleColor sees the same y.
          Object.assign(p, makeParticle(width, height, now, false, { x: p.x, y: p.y }))
          continue
        }

        // Fade in, hold, fade out — the actual "irregular emit and
        // disappear" behavior, since fadeDuration/lifeDuration differ
        // per particle and their `born` times are all offset.
        let baseOpacity: number
        if (t < p.fadeDuration) baseOpacity = t / p.fadeDuration
        else if (t > p.lifeDuration - p.fadeDuration) baseOpacity = (p.lifeDuration - t) / p.fadeDuration
        else baseOpacity = 1
        p.baseOpacity = Math.max(0, Math.min(1, baseOpacity))

        let targetGlow = p.baseOpacity
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

        // Cursor-influenced particles are forced to full brightness
        // (up to 1, uncapped) instead of the ambient MAX_BRIGHTNESS
        // ceiling — that's what makes them visibly "light up" rather
        // than just nudging along at their normal dim glow.
        const rendered = influenced ? Math.min(1, p.glow) : p.glow * MAX_BRIGHTNESS
        if (rendered <= 0.01) continue

        ctx!.beginPath()
        ctx!.fillStyle = `rgba(${p.colorRgb}, ${rendered})`
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
