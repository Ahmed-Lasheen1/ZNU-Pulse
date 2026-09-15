import { useEffect, useId, useState } from 'react'

// Vector ECG artwork (no raster image).
//
// PULSE_FILL_PATH is a precomputed, closed outline of the ECG stroke —
// not the centerline. Live-stroking the centerline directly left faint
// seams at the cusps where its chained bezier segments meet, so the
// static base line is filled from this pre-offset polygon instead,
// which has one clean silhouette and no seam to speak of.
//
// PULSE_CENTERLINE is kept separately for the animated shadow and
// traveling beam layers, since stroke-dasharray only works on strokes
// — both of those layers are blurred anyway, which hides any seam.
const PULSE_VIEWBOX = '118 173 821 563'

const PULSE_CENTERLINE = `M134 536
  H193
  C210 536 217 529 228 514
  C235 504 240 498 246 498
  C253 498 258 509 264 523
  C272 542 279 564 294 566
  C309 570 316 552 322 532
  L342 450
  C345 438 349 431 355 431
  C361 431 365 442 369 455
  L383 507
  C386 519 392 524 403 525
  C419 525 424 536 428 550
  L451 624
  L527 191
  L607 711
  L648 568
  C651 559 656 557 664 559
  C676 562 685 570 695 563
  C706 554 710 531 717 510
  C723 489 731 473 741 472
  C753 470 761 488 769 505
  C776 521 781 532 793 535
  C804 538 811 528 821 526
  C832 523 843 534 853 536
  H909`

const PULSE_FILL_PATH = "M134 523.5 L131.56 523.74 L127.06 525.61 L123.61 529.06 L121.74 533.56 L121.5 536 L122.45 540.78 L125.16 544.84 L129.22 547.55 L134 548.5 L193 548.5 L200.43 548.08 L207.18 546.78 L212.38 545.01 L217.22 542.59 L222.52 538.92 L226.27 535.58 L230.65 530.9 L243.28 514.34 L247.55 510.11 L245.39 510.48 L242.79 509.46 L245.16 512.49 L248.37 518.59 L259.26 544.24 L263.56 553.45 L267.7 560.67 L272.66 567.27 L275.82 570.46 L279.32 573.26 L283.32 575.63 L287.79 577.4 L293.4 578.65 L297.97 579.06 L302.78 578.62 L307.08 577.41 L313.48 573.88 L316.57 571.25 L319.45 568.09 L324.77 559.89 L329.52 549.08 L334.1 535.13 L354.6 451.2 L356.57 445.34 L358.38 442.15 L356.63 443.25 L354.28 443.48 L351.88 442.84 L350.21 441.65 L353.16 447.24 L356.93 458.25 L371.28 511.58 L372.97 516.61 L374.76 520.51 L377.01 524.2 L379.78 527.61 L382.81 530.4 L386.43 532.88 L390.29 534.77 L395.23 536.37 L407.24 538.05 L409.23 539.08 L410.9 540.89 L412.88 544.45 L414.91 549.88 L440.02 629.98 L443.17 633.74 L445.23 635.09 L448.72 636.29 L453.63 636.22 L455.98 635.47 L459.11 633.51 L461.53 630.73 L463.31 626.16 L539.31 193.16 L514.65 192.9 L594.65 712.9 L595.76 716.48 L597.08 718.61 L598.8 720.43 L600.84 721.88 L603.14 722.89 L605.58 723.42 L609.33 723.28 L611.73 722.57 L614.95 720.65 L616.71 718.87 L618.61 715.63 L659.8 572.12 L661.01 569.54 L660 570.43 L658.59 570.81 L663.29 571.8 L677.95 577.09 L682.3 577.99 L686.9 578.29 L692.06 577.71 L697.27 576.02 L702.21 573.21 L706.03 569.77 L708.82 566.5 L711.99 561.77 L716.49 552.61 L720.59 541.23 L732.9 501.51 L735.84 494.47 L738.72 489.1 L741.15 485.76 L743.23 484.13 L741.89 484.5 L743.56 484.29 L741.75 484.07 L742.75 484.47 L741.78 484.03 L742.76 484.52 L741.9 484.05 L744.93 486.78 L749.03 492.92 L753.99 502.5 L763.53 522.99 L766.46 528.31 L769.77 533.26 L773.87 538 L777.9 541.47 L783.29 544.72 L788.42 546.7 L792.9 547.73 L796.45 548.05 L803.58 547.28 L809.11 545.43 L820.77 539.23 L824.88 537.93 L823.98 538.11 L826.25 538.15 L829.62 539.31 L844.68 546.53 L851.61 548.42 L909 548.5 L913.78 547.55 L917.84 544.84 L920.55 540.78 L921.5 536 L921.26 533.56 L919.39 529.06 L915.94 525.61 L911.44 523.74 L853 523.5 L855.76 523.81 L851.67 522.35 L839.2 516.22 L833.62 514.24 L828.46 513.2 L823.01 513.05 L816.73 514.17 L810.28 516.54 L798.65 522.71 L796.82 523.08 L797.59 523.04 L794.74 522.47 L791.33 520.11 L788.28 516.08 L785.19 510.42 L776.51 491.64 L771.46 481.8 L765.75 472.85 L760.74 467.12 L757.62 464.48 L754.14 462.26 L750.41 460.63 L746.3 459.61 L741.93 459.37 L737.96 459.82 L731.47 462.02 L726.77 465.07 L721.8 469.94 L717.64 475.66 L713.32 483.61 L707.5 498.37 L694.58 540.02 L690.65 548.73 L688.62 551.76 L686.77 553.59 L688.15 552.55 L686.62 553.37 L687.43 553.07 L686.51 553.37 L687.35 553.13 L686.43 553.36 L687.27 553.18 L684.71 553.02 L671.25 548.1 L665.01 546.42 L660.39 545.83 L655.93 545.97 L650.77 547.21 L646.02 549.71 L641.95 553.37 L638.63 558.21 L635.98 564.55 L594.98 707.55 L619.35 709.1 L539.35 189.1 L538.23 185.51 L536.91 183.38 L535.19 181.56 L532.01 179.55 L529.63 178.78 L527.13 178.5 L523.41 179.03 L521.09 179.98 L519.01 181.39 L516.52 184.19 L515.37 186.42 L514.69 188.84 L438.69 621.84 L462.94 620.29 L438.77 542.42 L434.77 532.29 L431.7 527.03 L428.68 523.19 L425.68 520.27 L421.54 517.27 L417.87 515.39 L412.8 513.66 L400.23 511.82 L398.51 510.97 L397.31 509.61 L395.38 504.93 L381.01 451.53 L375.96 436.96 L372.67 430.24 L368.95 425.07 L365.02 421.64 L360.14 419.28 L356.63 418.58 L352.27 418.69 L348.68 419.54 L345.12 421.14 L341.77 423.52 L338.98 426.36 L336.34 430.06 L334.12 434.28 L332 439.67 L330.17 445.79 L309.86 529.04 L306.67 538.78 L303.89 545.72 L300.22 552.12 L297.94 554.22 L298.82 553.68 L297.77 554.27 L298.75 553.78 L297.66 554.27 L298.73 553.85 L297.6 554.23 L298.74 553.9 L297.57 554.18 L298.75 553.96 L297.54 554.13 L298.73 554.02 L297.48 554.07 L298.63 554.08 L294.8 553.45 L295.85 553.68 L293.19 552.46 L290.54 549.7 L287.86 545.76 L282.93 535.98 L270.96 507.88 L267.86 501.8 L264.43 496.34 L261.04 492.28 L257.54 489.28 L253.43 487 L249.42 485.81 L244.85 485.53 L240.54 486.21 L236.01 487.94 L231.88 490.53 L228.68 493.27 L225.06 497.15 L214.25 511.47 L210.12 516.36 L205.85 520.2 L201.7 522.34 L198.14 523.17 L194.05 523.49 Z"

const LINE_COLOR = '#F4FBFF'
const BEAM_COLOR = '#5fd9ff'
const STROKE_WIDTH = 25

// Length of the traveling highlight as a FRACTION of the path's total
// length (pathLength="1" on the animated paths makes this exact
// regardless of on-screen geometry). Kept generous — too short reads
// as a dot chasing the line instead of a moving piece of the line.
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
  // Unique per mount so multiple instances (or hot-reload remounts)
  // never collide on filter ids.
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

        {/* Shadow — heavily blurred, so a live stroke is fine here. */}
        <path
          d={PULSE_CENTERLINE}
          fill="none"
          stroke="#081D3D"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${shadowId})`}
        />

        {/* Base line — filled from the precomputed outline, no stroke,
            so no seam is possible. */}
        <path d={PULSE_FILL_PATH} fill={LINE_COLOR} fillRule="nonzero" />

        {/* Traveling highlight — stroked (needs dasharray) but always
            blurred, so any seam is invisible. Skipped under
            prefers-reduced-motion. */}
        {!reduced && (
          <>
            <path
              className="pulse-hero-beam"
              pathLength="1"
              d={PULSE_CENTERLINE}
              fill="none"
              stroke={BEAM_COLOR}
              strokeWidth={STROKE_WIDTH + 10}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.55"
              filter={`url(#${haloId})`}
            />
            <path
              className="pulse-hero-beam"
              pathLength="1"
              d={PULSE_CENTERLINE}
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
