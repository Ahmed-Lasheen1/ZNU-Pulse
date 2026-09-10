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

// Glow color for the ambient particle field — the same cyan already
// used for the ECG hero's traveling beam (see EcgHero.jsx), so this
// reads as the same "pulse" accent rather than introducing a new
// color just for this effect.
const PARTICLE_RGB = '95, 217, 255' // '#5fd9ff'

// How hard a nearby cursor shoves a particle, and how slowly that
// motion bleeds off afterward — high force + friction close to 1 is
// what makes the movement read as "heavy" (a shove that keeps
// carrying the particle for a while) rather than a snappy little
// nudge that stops the instant the cursor moves on.
const INFLUENCE_RADIUS = 150
const PUSH_FORCE = 2.2
const FRICTION = 0.965

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
  born: number
  lifeDuration: number
  fadeDuration: number
  opacity: number
}

function makeParticle(w: number, h: number, now: number, initial: boolean): Particle {
  const lifeDuration = 5000 + Math.random() * 7000 // ~5-12s fully visible cycle
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: 0,
    vy: 0,
    radius: 1 + Math.random() * 1.6,
    // Irregular timing: staggered on first paint so particles don't
    // all appear at once, and staggered on respawn so they never
    // settle into lockstep with each other.
    born: now + (initial ? Math.random() * 9000 : 1200 + Math.random() * 6000),
    lifeDuration,
    fadeDuration: lifeDuration * (0.3 + Math.random() * 0.2),
    opacity: 0,
  }
}

// Sparse, irregular ambient field — a handful of soft cyan points
// that fade in and out on their own random schedule (never in sync
// with each other) and otherwise sit perfectly still. The cursor is
// the only thing that ever moves them: coming near one snaps it to
// full brightness and gives it a hard shove away, which then coasts
// to a stop under friction — a "star flung through space" moment
// rather than a constant idle drift. Purely decorative: skipped
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

    // Sparse on purpose — scales gently with screen size but stays
    // capped in the 20-40 range so this reads as "a field of embers,"
    // not a particle storm.
    const count = Math.max(20, Math.min(40, Math.round((width * height) / 32000)))
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
      ctx!.globalCompositeOperation = 'lighter'

      for (const p of particles) {
        if (now < p.born) continue

        const t = now - p.born
        if (t > p.lifeDuration) {
          Object.assign(p, makeParticle(width, height, now, false))
          continue
        }

        // Fade in, hold, fade out — the actual "irregular emit and
        // disappear" behavior, since fadeDuration/lifeDuration differ
        // per particle and their `born` times are all offset.
        let opacity: number
        if (t < p.fadeDuration) opacity = t / p.fadeDuration
        else if (t > p.lifeDuration - p.fadeDuration) opacity = (p.lifeDuration - t) / p.fadeDuration
        else opacity = 1
        p.opacity = Math.max(0, Math.min(1, opacity))

        let glow = p.opacity

        if (hasMouse) {
          const dx = p.x - mouseX
          const dy = p.y - mouseY
          const dist = Math.hypot(dx, dy)
          if (dist < INFLUENCE_RADIUS && dist > 0.01) {
            const pull = 1 - dist / INFLUENCE_RADIUS
            // Squared falloff so the shove is dramatic right next to
            // the cursor and tapers off well before the edge of the
            // influence radius, instead of a linear ramp.
            const force = pull * pull * PUSH_FORCE
            p.vx += (dx / dist) * force
            p.vy += (dy / dist) * force
            glow = 1
          }
        }

        // Inertial coast — particles keep moving after the cursor
        // passes and slow down gradually, rather than snapping back
        // to rest the instant they're no longer influenced.
        p.x += p.vx
        p.y += p.vy
        p.vx *= FRICTION
        p.vy *= FRICTION

        if (p.x < -20) p.x = width + 20
        if (p.x > width + 20) p.x = -20
        if (p.y < -20) p.y = height + 20
        if (p.y > height + 20) p.y = -20

        if (glow <= 0.01) continue

        ctx!.beginPath()
        ctx!.fillStyle = `rgba(${PARTICLE_RGB}, ${glow})`
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
