import { useEffect, useId, useState } from 'react'

// Vector ECG artwork — replaces the previous raster PNG/WEBP hero image +
// separately-rasterized line-mask PNG entirely. This path is the exact
// vector outline (sourced from ecg_pulse.svg / ecg_pulse_with_shadow.svg),
// so the animated "traveling" beam below rides the EXACT same <path> used
// to draw the visible line — there's no more hand/auto-traced centerline
// approximation and no raster mask that has to stay in sync with a
// bitmap's pixel silhouette. This fixes three things at once:
//
//   1. Quality  — real vector, crisp at any size/DPR, instead of an
//      879x621 bitmap being upscaled on larger screens.
//   2. Shadow   — a real feGaussianBlur/feOffset filter (values lifted
//      straight from ecg_pulse_with_shadow.svg) instead of a shadow baked
//      into the old raster export, which couldn't be tuned at all.
//   3. Movement — the beam travels on the real path, so it can never
//      visually drift off the line the way an approximated centerline
//      could, especially through the tall central spike. It's also drawn
//      as a genuine moving LINE SEGMENT (a "comet trail"), not a point
//      blurred into a round blob — see BEAM_FRACTION below.
const PULSE_VIEWBOX = '115 165 825 575'
const PULSE_PATH = `M131 535
  C165 535 184 538 202 531
  C218 524 223 493 239 488
  C255 482 268 514 282 548
  C293 576 307 578 318 557
  C330 534 338 474 349 438
  C355 417 366 419 372 441
  C379 465 378 498 391 522
  C402 540 415 526 425 550
  C437 575 441 616 451 620
  C463 626 468 594 470 568
  L516 196
  C518 181 534 177 537 195
  L607 700
  C609 719 625 721 631 701
  L665 577
  C670 558 684 548 697 558
  C713 569 725 568 731 547
  C738 522 738 487 750 469
  C761 453 773 463 781 480
  C794 507 795 527 812 535
  C831 545 843 526 861 529
  C878 532 889 536 910 535`

const LINE_COLOR = '#F4FBFF'
const BEAM_COLOR = '#5fd9ff'
const STROKE_WIDTH = 25

// Length of the traveling highlight, as a FRACTION of the path's total
// length. pathLength="1" (set on each animated <path> below) makes this
// fraction exact regardless of the path's real on-screen geometry, so it
// doesn't need retuning if the artwork ever changes.
//
// This is deliberately generous — a short fraction here (as the previous
// version used) reads as a moving dot once any blur is applied to it,
// which is what made it look like an "orb" chasing the line instead of a
// highlight traveling ALONG it. At 0.13 the visible segment is long
// relative to the stroke width, so it unambiguously reads as a moving
// piece of line.
const BEAM_FRACTION = 0.13
const BEAM_DURATION = '7s'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e) => setReduced(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

export default function EcgHero({ height = 220 }) {
  const reduced = usePrefersReducedMotion()
  // Unique per mount so multiple EcgHero instances on the same page (or
  // hot-reload remounts) never collide on filter ids — same pattern
  // StreakFlameIcon already uses for its gradient id.
  const uid = useId()
  const shadowId = `ecgShadow-${uid}`
  const haloId = `pulseBeamHalo-${uid}`
  const glowId = `pulseBeamGlow-${uid}`

  return (
    <div style={{
      position: 'relative', width: '100%', height, maxHeight: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{`
        /* pathLength="1" makes the path exactly 1 unit long regardless of
           its real geometry, so dasharray/dashoffset work in clean,
           artwork-independent fractions. A ${BEAM_FRACTION * 100}%-long
           segment chases once around the path every ${BEAM_DURATION} —
           a real moving LINE, not a point. */
        @keyframes pulseHeroDash {
          0%   { stroke-dashoffset: ${1 + BEAM_FRACTION}; }
          100% { stroke-dashoffset: 0; }
        }
        .pulse-hero-beam {
          stroke-dasharray: ${BEAM_FRACTION} 1;
          animation: pulseHeroDash ${BEAM_DURATION} linear infinite;
        }
      `}</style>

      <svg
        viewBox={PULSE_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        width="100%" height="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <filter id={shadowId} x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="13" result="blur" />
            <feOffset in="blur" dx="9" dy="17" result="offsetBlur" />
            <feColorMatrix
              in="offsetBlur" type="matrix"
              values="0 0 0 0 0.00
                      0 0 0 0 0.05
                      0 0 0 0 0.12
                      0 0 0 0.72 0"
              result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
            </feMerge>
          </filter>

          {!reduced && (
            <>
              <filter id={haloId} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
              <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </>
          )}
        </defs>

        {/* Shadow — a real offset/blur filter now, not baked into a raster export */}
        <path
          d={PULSE_PATH}
          fill="none"
          stroke="#081D3D"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${shadowId})`}
        />

        {/* Base line */}
        <path
          d={PULSE_PATH}
          fill="none"
          stroke={LINE_COLOR}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Traveling highlight — same exact path as the base line above,
            so it can never drift off it. Not rendered at all under
            prefers-reduced-motion, same guard the previous version used. */}
        {!reduced && (
          <>
            {/* Soft wide halo */}
            <path
              className="pulse-hero-beam"
              pathLength="1"
              d={PULSE_PATH}
              fill="none"
              stroke={BEAM_COLOR}
              strokeWidth={STROKE_WIDTH + 10}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.55"
              filter={`url(#${haloId})`}
            />
            {/* Bright core, same motion */}
            <path
              className="pulse-hero-beam"
              pathLength="1"
              d={PULSE_PATH}
              fill="none"
              stroke={BEAM_COLOR}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${glowId})`}
            />
          </>
        )}
      </svg>
    </div>
  )
}
