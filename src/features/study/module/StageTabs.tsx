import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform, type Transition } from 'framer-motion'
import { getPulseTheme, pulseFonts } from '@/shared/theme/premiumTheme'
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'

export interface StageTabItem {
  value: string
  title: string
  color: string
  emoji?: string
  Icon?: (props: { color: string; size?: number }) => JSX.Element
}

interface StageTabsProps {
  dark: boolean
  items: StageTabItem[]
  active: string | null
  onSelect: (value: string | null) => void
}

interface HighlightBox {
  left: number
  right: number
  color: string
  direction: 1 | -1
  jump: boolean
}

// Exponential ease-out: almost all of the movement happens at the very start, then a long gentle tail.
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

// Seconds the edge moving toward the new tab takes, and the (longer) time the edge left behind takes to catch up.
// The difference between the two is what stretches the highlight.
const LEADING_SECONDS = 0.5
const TRAILING_SECONDS = 0.9

// Largest height loss of the highlight while it is stretched (0.14 = 14%) and how fast it is reached.
const MAX_SQUASH = 0.14
const SQUASH_RATE = 0.2

// Picks dark or light text so the label stays readable on the stage colour.
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

// Ease-out transitions for the two edges of the highlight. The leading edge (toward the new tab) finishes first;
// the trailing edge takes longer, so the pill stretches right after the click and then slowly settles into the tab.
// The return type is inferred (a plain duration/ease object) because animate() on a MotionValue
// accepts a value transition, not the full `Transition` union.
function edgeTransitions(direction: 1 | -1) {
  const leading = { duration: LEADING_SECONDS, ease: EASE_OUT_EXPO }
  const trailing = { duration: TRAILING_SECONDS, ease: EASE_OUT_EXPO }
  return direction > 0
    ? { right: leading, left: trailing }
    : { left: leading, right: trailing }
}

// Stage tab row with one sliding highlight that launches fast, stretches, and settles slowly on the selected tab.
export default function StageTabs({ dark, items, active, onSelect }: StageTabsProps) {
  const pt = getPulseTheme(dark)
  const reduced = usePrefersReducedMotion()
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({})
  const wasVisible = useRef(false)
  const prevIndexRef = useRef(-1)
  const lastDirectionRef = useRef<1 | -1>(1)
  // Width of the selected tab; the stretch is measured against it.
  const targetWidthRef = useRef(0)
  // Leftmost and rightmost tab edges; the highlight never extends past them.
  const boundsRef = useRef({ min: 0, max: 0 })
  const [box, setBox] = useState<HighlightBox | null>(null)

  // Edge positions live in motion values, so the animation runs outside React's render cycle.
  const leftMV = useMotionValue(0)
  const rightMV = useMotionValue(0)
  // The highlight is placed with x (left edge) and width (right edge minus left edge), inside the first/last tab bounds.
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

  // Measures the selected tab and updates the highlight target, remembering which way it moved.
  function measure(jump: boolean) {
    const button = active ? buttons.current[active] : null
    const color = items.find(item => item.value === active)?.color
    if (!button || !color) return

    const index = items.findIndex(item => item.value === active)
    const prevIndex = prevIndexRef.current
    if (index !== prevIndex && prevIndex !== -1) {
      lastDirectionRef.current = index > prevIndex ? 1 : -1
    }
    prevIndexRef.current = index

    const first = buttons.current[items[0].value]
    const last = buttons.current[items[items.length - 1].value]
    if (first && last) boundsRef.current = { min: first.offsetLeft, max: last.offsetLeft + last.offsetWidth }

    const left = button.offsetLeft
    const right = left + button.offsetWidth
    const direction = lastDirectionRef.current
    targetWidthRef.current = button.offsetWidth
    setBox(prev =>
      prev && prev.left === left && prev.right === right && prev.color === color && prev.direction === direction
        ? prev
        : { left, right, color, direction, jump }
    )
  }

  // Keeps the highlight in place when the selection or the tab sizes change.
  useLayoutEffect(() => {
    if (!active) {
      wasVisible.current = false
      prevIndexRef.current = -1
      return
    }
    measure(!wasVisible.current)
    wasVisible.current = true
    const button = buttons.current[active]
    if (!button || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure(true))
    observer.observe(button)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, items])

  // Moves the highlight edges toward the new target. Stopping a running animation keeps its current position.
  useLayoutEffect(() => {
    if (!box) return
    leftControls.current?.stop()
    rightControls.current?.stop()
    if (box.jump || reduced) {
      leftMV.set(box.left)
      rightMV.set(box.right)
      return
    }
    const edges = edgeTransitions(box.direction)
    leftControls.current = animate(leftMV, box.left, edges.left)
    rightControls.current = animate(rightMV, box.right, edges.right)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, reduced])

  // Scrolls the selected tab into view on small screens.
  useEffect(() => {
    if (!active) return
    buttons.current[active]?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [active, reduced])

  const instant: Transition = { duration: 0 }
  const colorFade: Transition = box?.jump ? instant : { duration: 0.5, ease: 'easeInOut' }

  return (
    <div className="stage-tabs-wrap">
      <style>{`
        .stage-tabs-wrap { display: flex; justify-content: center; }
        .stage-tabs-track {
          position: relative; display: flex; gap: 6px; padding: 8px; overflow-x: auto;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
        }
        .stage-tabs-track::-webkit-scrollbar { display: none; }
        .stage-tab-highlight {
          position: absolute; top: 8px; left: 0; height: 50px;
          border-radius: 999px; pointer-events: none;
          background-image: linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%);
          will-change: transform, width;
        }
        .stage-tab {
          position: relative; flex: 0 0 auto; height: 50px; padding: 0 22px;
          border: none; border-radius: 999px; background: transparent;
          cursor: pointer; white-space: nowrap; scroll-snap-align: center;
          font-weight: 800; font-size: 14.5px; letter-spacing: 0.2px;
          transition: color 0.35s ease, background 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .stage-tab-label { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 9px; }
        .stage-tab-icon { display: inline-flex; }
        .stage-tab:not([aria-pressed="true"]):hover { background: var(--stage-tab-hover); }
        @media (max-width: 480px) {
          .stage-tab { height: 44px; padding: 0 16px; font-size: 13px; }
          .stage-tabs-track { padding: 6px; }
          .stage-tab-highlight { top: 6px; height: 44px; }
        }
      `}</style>

      <PulseGlassRow
        dark={dark}
        radius={999}
        active
        activeTint={`${pt.cobalt}1f`}
        style={{ maxWidth: '100%', minWidth: 0, ['--stage-tab-hover' as string]: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)' }}
      >
        <div className="stage-tabs-track" role="group" aria-label="Exam stage">
          {box && (
            <motion.span
              className="stage-tab-highlight"
              aria-hidden
              initial={{ opacity: 0, backgroundColor: box.color, boxShadow: glow(box.color) }}
              animate={{
                opacity: active ? 1 : 0,
                backgroundColor: box.color,
                boxShadow: glow(box.color),
              }}
              style={{ x: xMV, width: widthMV, scaleY: scaleYMV }}
              transition={reduced || box.jump
                ? instant
                : { backgroundColor: colorFade, boxShadow: colorFade, opacity: { duration: 0.25 } }}
            />
          )}
          {items.map(item => {
            const isActive = item.value === active
            const onColor = readableOn(item.color)
            const iconColor = isActive ? onColor : item.color
            return (
              <motion.button
                key={item.value}
                ref={el => { buttons.current[item.value] = el }}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelect(isActive ? null : item.value)}
                className="stage-tab glass-focus-ring"
                whileTap={reduced ? undefined : { scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                style={{ color: isActive ? onColor : pt.textPrimary, fontFamily: pulseFonts.body }}
              >
                <span className="stage-tab-label">
                  {item.Icon && (
                    <motion.span
                      className="stage-tab-icon"
                      animate={reduced ? undefined : { scale: isActive ? 1.15 : 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 11 }}
                    >
                      <item.Icon color={iconColor} size={18} />
                    </motion.span>
                  )}
                  {!item.Icon && item.emoji && (
                    <motion.span
                      className="stage-tab-icon"
                      animate={reduced ? undefined : { scale: isActive ? 1.15 : 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 11 }}
                      style={{ fontSize: 16, lineHeight: 1 }}
                    >
                      {item.emoji}
                    </motion.span>
                  )}
                  {item.title}
                </span>
              </motion.button>
            )
          })}
        </div>
      </PulseGlassRow>
    </div>
  )
}
