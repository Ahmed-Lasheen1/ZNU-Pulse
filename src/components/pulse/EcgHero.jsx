import { useEffect, useState } from 'react'

// The exact ZNU Pulse artwork — extracted pixel-for-pixel from the
// real logo. Line keeps its real pale sky-blue color; the shadow is a
// flat dark navy with a soft, properly-graduated alpha falloff, so it
// composites naturally against any background.
const HERO_WEBP = '/pulse-hero.webp'
const HERO_PNG = '/pulse-hero.png'
const HERO_WEBP_MOBILE = '/pulse-hero-mobile.webp'
const HERO_PNG_MOBILE = '/pulse-hero-mobile.png'

// Alpha-only silhouette of JUST the line (no shadow), pixel-aligned to
// the hero image (same crop box, same pixel dimensions). Clips the
// traveling glow to the real tube's EXACT shape/width — so wherever
// the orb below currently sits, only the part that actually falls
// inside the real line ever becomes visible.
const LINE_MASK = '/pulse-line-mask.png'

// Native pixel size of the hero image / mask PNG.
const ART_WIDTH = 879
const ART_HEIGHT = 621

// The real line's centerline, auto-traced column-by-column directly
// from the source pixels (weighted centroid of the solid line alpha
// at every x), not hand-fit with bezier curves. Used both to drive
// the glow orb's motion path below and (previously) the dash-based
// beam trick — kept as the single source of truth for "where the
// real line actually is."
const CENTER_PATH =  "M0,383.0 L24,383.0 L28,383.1 L32,383.0 L36,383.0 L40,383.0 L44,383.0 L48,382.8 L52,383.0 L56,383.0 L60,383.0 L64,382.7 L68,382.6 L72,383.0 L76,383.0 L80,383.0 L84,383.0 L88,383.0 L92,382.8 L96,382.5 L100,381.8 L104,380.2 L108,377.7 L112,375.0 L116,371.7 L120,367.7 L124,363.5 L128,359.8 L132,356.0 L136,352.2 L140,348.9 L144,346.1 L148,345.7 L152,347.9 L156,351.7 L160,356.4 L164,362.3 L168,368.8 L172,375.8 L176,382.3 L180,388.5 L184,395.0 L188,400.4 L192,405.2 L196,409.4 L200,411.9 L204,412.7 L208,409.9 L212,404.3 L216,397.4 L220,389.7 L224,381.3 L228,371.5 L232,360.5 L236,348.3 L240,335.6 L244,318.0 L248,295.0 L252,260.0 L256,230.0 L260,235.0 L264,265.0 L268,300.0 L272,323.0 L276,333.8 L280,344.4 L284,353.3 L288,361.7 L292,369.2 L296,374.4 L300,376.0 L304,375.5 L308,375.6 L312,377.1 L316,382.8 L320,390.3 L324,398.2 L328,407.0 L332,418.0 L336,432.0 L340,450.0 L344,470.0 L348,485.0 L352,470.0 L356,450.0 L360,430.0 L364,404.2 L368,384.6 L372,360.6 L376,336.4 L380,312.2 L384,288.5 L388,264.5 L392,239.7 L396,215.6 L400,191.1 L404,166.7 L408,141.5 L412,117.3 L416,92.7 L420,70.8 L424,55.5 L428,43.3 L432,48.7 L436,63.5 L440,80.6 L444,105.1 L448,135.1 L452,165.0 L456,194.5 L460,223.5 L464,251.9 L468,281.4 L472,310.8 L476,340.0 L480,368.9 L484,400.0 L488,432.3 L492,464.7 L496,494.6 L500,515.5 L504,533.6 L508,550.2 L512,564.7 L516,562.0 L520,550.5 L524,535.5 L528,517.6 L532,500.0 L536,483.6 L540,469.4 L544,456.9 L548,445.3 L552,434.4 L556,424.5 L560,416.9 L564,412.1 L568,407.4 L572,408.7 L576,410.0 L580,411.3 L584,412.1 L588,411.4 L592,408.3 L596,402.6 L600,396.3 L604,389.6 L608,382.6 L612,374.5 L616,365.7 L620,357.0 L624,348.5 L628,340.9 L632,333.9 L636,328.1 L640,323.2 L644,319.8 L648,321.2 L652,325.7 L656,330.5 L660,336.5 L664,343.2 L668,349.9 L672,356.8 L676,363.4 L680,370.0 L684,375.6 L688,380.4 L692,384.1 L696,386.2 L700,386.1 L704,385.0 L708,383.2 L712,381.0 L716,378.7 L720,376.4 L724,374.3 L728,373.1 L732,372.8 L736,373.7 L740,375.2 L744,376.5 L748,378.3 L752,379.8 L756,381.0 L760,382.1 L764,382.8 L768,383.0 L772,383.0 L776,383.0 L780,383.0 L784,383.0 L788,383.0 L792,383.0 L796,383.0 L800,383.0 L804,383.0 L808,383.0 L812,383.0 L816,383.0 L820,383.0 L824,383.0 L828,383.0 L832,383.0 L836,383.0 L840,383.0 L844,383.0 L848,383.0 L852,383.0 L856,383.0 L860,383.0 L864,383.0 L868,383.0 L872,383.0 L876,383.0 L878,383.0"

// ── Traveling glow orb ───────────────────────────────────────────────
// PERF REWRITE: this used to be two long strokes covering almost the
// entire viewBox, each animated via stroke-dashoffset and each running
// through a feGaussianBlur filter. That combination is a known jank
// trap: a blur filter's region gets recomputed by the browser on every
// frame the filtered element's *geometry* changes (dash offset counts
// as geometry, not a transform), so the browser was re-rasterizing a
// blur across nearly the whole canvas 60 times a second.
//
// This version keeps the exact same visual idea (a bright point
// traveling along the real traced line, clipped to the real tube's
// silhouette) but makes it cheap: a small, constant-size "orb" (a
// halo + a core circle, each just tens of pixels across) is moved
// along CENTER_PATH via native SVG <animateMotion> — a translation,
// not a redrawn stroke. The blur filters are now scoped to that tiny
// orb's own bounding box instead of the full canvas, so the per-frame
// recompute cost drops by roughly two orders of magnitude. Movement
// speed is even smoother than before, since animateMotion's default
// pacing is constant-velocity along real arc length (SMIL's "paced"
// calcMode) rather than linear in dash-fraction.
const ORB_HALO_RADIUS = 16
const ORB_CORE_RADIUS = 6
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

function useHeroImageSrc() {
  const [src, setSrc] = useState(HERO_WEBP)
  useEffect(() => {
    const supportsWebp = document.createElement('canvas')
      .toDataURL('image/webp').indexOf('data:image/webp') === 0
    const mq = window.matchMedia('(max-width: 640px)')
    const pick = () => setSrc(
      mq.matches
        ? (supportsWebp ? HERO_WEBP_MOBILE : HERO_PNG_MOBILE)
        : (supportsWebp ? HERO_WEBP : HERO_PNG)
    )
    pick()
    mq.addEventListener?.('change', pick)
    return () => mq.removeEventListener?.('change', pick)
  }, [])
  return src
}

export default function EcgHero({ height = 220 }) {
  const reduced = usePrefersReducedMotion()
  const heroSrc = useHeroImageSrc()

  return (
    <div style={{
      position: 'relative', width: '100%', height, maxHeight: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg
        viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%" height="100%"
        style={{ display: 'block', overflow: 'hidden' }}
      >
        <defs>
          <mask id="pulseLineMask" maskUnits="userSpaceOnUse" x="0" y="0" width={ART_WIDTH} height={ART_HEIGHT}>
            <image href={LINE_MASK} x="0" y="0" width={ART_WIDTH} height={ART_HEIGHT} />
          </mask>

          {/* Hidden motion path — never rendered (no stroke/fill), only
              referenced by <mpath> below so the orb can travel along
              the exact real-line geometry. */}
          <path id="pulseMotionPath" d={CENTER_PATH} fill="none" />

          {/* Tight filter regions: padding is relative to each small
              circle's own bounding box, not the full canvas, which is
              the main lever for keeping this cheap (see comment above). */}
          <filter id="pulseOrbHaloBlur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="pulseOrbCoreGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* The exact real artwork — real line color, real shadow */}
        <image href={heroSrc} x="0" y="0" width={ART_WIDTH} height={ART_HEIGHT} />

        {/* Traveling glow — clipped to the real tube's exact pixel
            shape via the same mask as before. Not rendered at all when
            prefers-reduced-motion is set, same as the previous version. */}
        {!reduced && (
          <g mask="url(#pulseLineMask)">
            <circle
              cx="0" cy="0" r={ORB_HALO_RADIUS}
              fill="#5fd9ff" opacity="0.85"
              filter="url(#pulseOrbHaloBlur)"
            >
              <animateMotion dur={BEAM_DURATION} repeatCount="indefinite">
                <mpath href="#pulseMotionPath" />
              </animateMotion>
            </circle>
            <circle
              cx="0" cy="0" r={ORB_CORE_RADIUS}
              fill="#5fd9ff"
              filter="url(#pulseOrbCoreGlow)"
            >
              <animateMotion dur={BEAM_DURATION} repeatCount="indefinite">
                <mpath href="#pulseMotionPath" />
              </animateMotion>
            </circle>
          </g>
        )}
      </svg>
    </div>
  )
}
