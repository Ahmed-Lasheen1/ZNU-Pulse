import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { animate, motion, useMotionValue, useTransform, type Transition } from 'framer-motion'
import { getPulseTheme, pulseFonts } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import { ModuleIcon } from '@/shared/icons/medicalIcons'
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'

export interface TabRowItem {
  value: string
  label: string
  // Emoji or "icon:<key>" string, resolved via ModuleIcon.
  icon?: string | null
  // Real icon component — takes precedence over `icon` when both are set.
  Icon?: (props: { color: string; size?: number }) => JSX.Element
  // Per-item color; falls back to `accentColor` when unset.
  color?: string
  completed?: boolean
}

interface TabRowProps {
  items: TabRowItem[]
  active: string | null
  // Receives null only when `allowDeselect` is on and the active tab is clicked again.
  onSelect: (value: string | null) => void
  dark: boolean
  accentColor?: string
  // Layout of the row. `flexWrap: 'wrap'` makes the tabs wrap onto several lines.
  style?: CSSProperties
  // 'lg' is the taller variant used for the exam-stage tabs.
  size?: 'md' | 'lg'
  // Lets a click on the active tab clear the selection.
  allowDeselect?: boolean
  // Keeps a wrapping row on one scrollable line on phones.
  scrollOnMobile?: boolean
  ariaLabel?: string
}

interface HighlightBox {
  left: number
  right: number
  top: number
  height: number
  color: string
  direction: 1 | -1
  // True when the new tab sits on another line of a wrapped row (no stretch in that case).
  lineChange: boolean
  jump: boolean
}

const MOBILE_QUERY = '(max-width: 640px)'

// Exponential ease-out: almost all of the movement happens at the very start, then a long gentle tail.
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

// Seconds the leading edge takes, and the longer time the trailing edge takes to catch up (this stretches the highlight).
const LEADING_SECONDS = 0.5
const TRAILING_SECONDS = 0.9

// Largest height loss of the highlight while stretched (0.14 = 14%) and how fast it is reached.
const MAX_SQUASH = 0.14
const SQUASH_RATE = 0.2

// Picks dark or light text so the label stays readable on the highlight colour.
function readableOn(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!match) return '#0f172a'
  const n = parseInt(match[1], 16)
  const luminance = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return luminance > 0.55 ? '#0f172a' : '#ffffff'
}

// Converts a hex colour to an rgba string with the given alpha.
function toRgba(hex: string, alpha: number) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!match) return `rgba(100,116,139,${alpha})`
  const n = parseInt(match[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

// Soft coloured shadow that makes the highlight look lifted.
function glow(color: string) {
  return `0 8px 24px ${toRgba(color, 0.4)}, inset 0 1px 0 rgba(255,255,255,0.45)`
}

// Ease-out transitions for the two highlight edges; the edge toward the new tab finishes first.
// The return type is inferred (a plain duration/ease object) because animate() on a MotionValue
// accepts a value transition, not the full `Transition` union.
function edgeTransitions(direction: 1 | -1) {
  const leading = { duration: LEADING_SECONDS, ease: EASE_OUT_EXPO }
  const trailing = { duration: TRAILING_SECONDS, ease: EASE_OUT_EXPO }
  return direction > 0
    ? { right: leading, left: trailing }
    : { left: leading, right: trailing }
}

// Shared row of glass tabs with one highlight that launches fast, stretches, and settles on the selected tab.
// Used for module switching, exam-stage filters and subject filters across the app.
export default function TabRow({
  items, active, onSelect, dark, accentColor, style, size = 'md', allowDeselect = false, scrollOnMobile = false, ariaLabel,
}: TabRowProps) {
  const pt = getPulseTheme(dark)
  const reduced = usePrefersReducedMotion()
  const narrow = useMediaQuery(MOBILE_QUERY)
  const trackRef = useRef<HTMLDivElement>(null)
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({})
  const wasVisible = useRef(false)
  const hasScrolled = useRef(false)
  const prevIndexRef = useRef(-1)
  const prevTopRef = useRef<number | null>(null)
  const lastDirectionRef = useRef<1 | -1>(1)
  // Width of the selected tab; the stretch is measured against it.
  const targetWidthRef = useRef(0)
  // Leftmost and rightmost tab edges; the highlight never extends past them.
  const boundsRef = useRef({ min: 0, max: 0 })
  const [box, setBox] = useState<HighlightBox | null>(null)

  // Edge positions live in motion values, so the animation runs outside React's render cycle.
  const leftMV = useMotionValue(0)
  const rightMV = useMotionValue(0)
  const topMV = useMotionValue(0)
  // The highlight is placed with x (left edge) and width (right edge minus left edge), inside the tab bounds.
  const xMV = useTransform(leftMV, l => Math.max(boundsRef.current.min, l))
  const widthMV = useTransform([leftMV, rightMV], (latest: number[]) => {
    const left = Math.max(boundsRef.current.min, latest[0])
    const right = Math.min(boundsRef.current.max || latest[1], latest[1])
    return Math.max(0, right - left)
  })
  // The highlight gets slightly shorter the more it is stretched, like a squeezed drop of liquid.
  const scaleYMV = useTransform(widthMV, w => {
    const base = targetWidthRef.current || w || 1
    const stretch = Math.max(0, w / base - 1)
    return 1 - Math.min(MAX_SQUASH, stretch * SQUASH_RATE)
  })
  const leftControls = useRef<ReturnType<typeof animate> | null>(null)
  const rightControls = useRef<ReturnType<typeof animate> | null>(null)
  const topControls = useRef<ReturnType<typeof animate> | null>(null)

  // Layout props go to the outer row; wrapping and scrolling are handled by the capsule's own track.
  const wrapped = style?.flexWrap === 'wrap' && !(scrollOnMobile && narrow)
  const rowGap = style?.rowGap
  const justifyContent = style?.justifyContent
  const outerStyle: CSSProperties = { ...style }
  delete outerStyle.flexWrap
  delete outerStyle.rowGap
  delete outerStyle.overflowX

  const large = size === 'lg'
  const iconSize = large ? 18 : 14
  // Changes only when tabs are added, removed or renamed, so inline `items` arrays do not re-run the effects below.
  const itemsKey = items.map(item => `${item.value}:${item.label}`).join('|')
  const shown = !!active && items.some(item => item.value === active)

  // Measures the selected tab and updates the highlight target, remembering which way it moved.
  function measure(jump: boolean) {
    const button = active ? buttons.current[active] : null
    const item = items.find(i => i.value === active)
    if (!button || !item) return
    const color = item.color || accentColor || pt.cobalt

    const index = items.findIndex(i => i.value === active)
    const prevIndex = prevIndexRef.current
    if (index !== prevIndex && prevIndex !== -1) {
      lastDirectionRef.current = index > prevIndex ? 1 : -1
    }
    prevIndexRef.current = index

    let min = Infinity
    let max = 0
    items.forEach(i => {
      const el = buttons.current[i.value]
      if (!el) return
      min = Math.min(min, el.offsetLeft)
      max = Math.max(max, el.offsetLeft + el.offsetWidth)
    })
    boundsRef.current = { min: Number.isFinite(min) ? min : 0, max }

    const left = button.offsetLeft
    const right = left + button.offsetWidth
    const top = button.offsetTop
    const height = button.offsetHeight
    const lineChange = prevTopRef.current !== null && prevTopRef.current !== top
    prevTopRef.current = top
    targetWidthRef.current = button.offsetWidth
    const direction = lastDirectionRef.current

    setBox(prev =>
      prev && prev.left === left && prev.right === right && prev.top === top && prev.height === height
        && prev.color === color && prev.direction === direction
        ? prev
        : { left, right, top, height, color, direction, lineChange, jump }
    )
  }

  // Keeps the highlight in place when the selection, the tabs or their sizes change (fonts loading, resizing).
  useLayoutEffect(() => {
    if (!shown) {
      wasVisible.current = false
      prevIndexRef.current = -1
      prevTopRef.current = null
      return
    }
    measure(!wasVisible.current)
    wasVisible.current = true
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure(true))
    if (trackRef.current) observer.observe(trackRef.current)
    items.forEach(item => { const el = buttons.current[item.value]; if (el) observer.observe(el) })
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, itemsKey, size, wrapped, shown])

  // Moves the highlight toward the new target; stopping a running animation keeps its current position.
  useLayoutEffect(() => {
    if (!box) return
    leftControls.current?.stop()
    rightControls.current?.stop()
    topControls.current?.stop()
    if (box.jump || reduced) {
      leftMV.set(box.left)
      rightMV.set(box.right)
      topMV.set(box.top)
      return
    }
    const leading: Transition = { duration: LEADING_SECONDS, ease: EASE_OUT_EXPO }
    const edges = box.lineChange ? { left: leading, right: leading } : edgeTransitions(box.direction)
    leftControls.current = animate(leftMV, box.left, edges.left)
    rightControls.current = animate(rightMV, box.right, edges.right)
    topControls.current = animate(topMV, box.top, leading)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, reduced])

  // Scrolls only the row itself (never the page) so the selected tab stays centered in a scrolling row.
  useEffect(() => {
    const track = trackRef.current
    const button = active ? buttons.current[active] : null
    if (!track || !button || wrapped || track.scrollWidth <= track.clientWidth) return
    const smooth = hasScrolled.current && !reduced
    hasScrolled.current = true
    track.scrollTo({ left: button.offsetLeft - (track.clientWidth - button.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' })
  }, [active, wrapped, reduced])

  const instant: Transition = { duration: 0 }
  const colorFade: Transition = box?.jump ? instant : { duration: 0.5, ease: 'easeInOut' }

  const outerBase: CSSProperties = {
    display: 'flex', marginBottom: 16,
    ...(scrollOnMobile ? { minWidth: 0, maxWidth: '100%' } : {}),
    ...outerStyle,
  }
  if (items.length === 0) return <div style={outerBase} />

  return (
    <div style={outerBase}>
      <style>{`
        .tab-row-track {
          position: relative; display: flex; gap: 4px; padding: 5px; overflow-x: auto;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
        }
        .tab-row-track::-webkit-scrollbar { display: none; }
        .tab-row-lg { gap: 6px; padding: 8px; }
        .tab-row-wrapped { flex-wrap: wrap; overflow: visible; }
        .tab-row-highlight {
          position: absolute; top: 0; left: 0; z-index: 0;
          border-radius: 999px; pointer-events: none;
          background-image: linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%);
          will-change: transform, width;
        }
        .tab-row-btn {
          position: relative; z-index: 1; flex: 0 0 auto; height: 36px; padding: 0 16px;
          border: none; border-radius: 999px; background: transparent;
          cursor: pointer; white-space: nowrap; scroll-snap-align: center;
          font-weight: 700; font-size: 13px;
          transition: color 0.35s ease, background 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .tab-row-lg .tab-row-btn { height: 50px; padding: 0 22px; font-weight: 800; font-size: 14.5px; letter-spacing: 0.2px; }
        .tab-row-label { display: inline-flex; align-items: center; gap: 6px; }
        .tab-row-lg .tab-row-label { gap: 9px; }
        .tab-row-icon { display: inline-flex; }
        .tab-row-btn:not([aria-pressed="true"]):hover { background: var(--tab-row-hover); }
        @media (max-width: 480px) {
          .tab-row-lg { padding: 6px; }
          .tab-row-lg .tab-row-btn { height: 44px; padding: 0 16px; font-size: 13px; }
        }
      `}</style>

      <PulseGlassRow
        dark={dark}
        radius={wrapped ? 28 : 999}
        style={{ maxWidth: '100%', minWidth: 0, ['--tab-row-hover' as string]: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)' }}
      >
        <div
          ref={trackRef}
          className={`tab-row-track${large ? ' tab-row-lg' : ''}${wrapped ? ' tab-row-wrapped' : ''}`}
          role="group"
          aria-label={ariaLabel}
          style={{ justifyContent: wrapped ? justifyContent : undefined, rowGap: wrapped ? rowGap ?? 6 : undefined }}
        >
          {box && (
            <motion.span
              className="tab-row-highlight"
              aria-hidden
              initial={{ opacity: 0, backgroundColor: box.color, boxShadow: glow(box.color) }}
              animate={{
                opacity: shown ? 1 : 0,
                backgroundColor: box.color,
                boxShadow: glow(box.color),
              }}
              style={{ x: xMV, y: topMV, width: widthMV, scaleY: scaleYMV, height: box.height }}
              transition={reduced || box.jump
                ? instant
                : { backgroundColor: colorFade, boxShadow: colorFade, opacity: { duration: 0.25 } }}
            />
          )}
          {items.map(item => {
            const isActive = item.value === active
            const color = item.color || accentColor || pt.cobalt
            const onColor = readableOn(color)
            // On the highlight the icon uses the contrasting text color; otherwise the item color, adjusted to stay readable on the glass.
            const iconColor = isActive ? onColor : adaptColor(color, dark)
            const iconMotion = {
              animate: reduced ? undefined : { scale: isActive ? 1.15 : 1 },
              transition: { type: 'spring', stiffness: 380, damping: 11 } as Transition,
            }
            return (
              <motion.button
                key={item.value}
                ref={el => { buttons.current[item.value] = el }}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelect(allowDeselect && isActive ? null : item.value)}
                className="tab-row-btn glass-focus-ring"
                whileTap={reduced ? undefined : { scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                style={{ color: isActive ? onColor : pt.textPrimary, fontFamily: pulseFonts.body }}
              >
                <span className="tab-row-label">
                  {item.Icon ? (
                    <motion.span className="tab-row-icon" {...iconMotion}>
                      <item.Icon color={iconColor} size={iconSize} />
                    </motion.span>
                  ) : item.icon ? (
                    <motion.span className="tab-row-icon" {...iconMotion}>
                      <ModuleIcon value={item.icon} size={iconSize} color={iconColor} />
                    </motion.span>
                  ) : null}
                  {item.label}
                  {item.completed && <span aria-hidden style={{ fontSize: 10, opacity: 0.7 }}>✓</span>}
                </span>
              </motion.button>
            )
          })}
        </div>
      </PulseGlassRow>
    </div>
  )
}
