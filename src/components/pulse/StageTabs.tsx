import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { getPulseTheme, pulseFonts } from '../../premiumTheme'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'
import PulseGlassRow from './PulseGlassRow'

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

function readableOn(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!match) return '#0f172a'
  const n = parseInt(match[1], 16)
  const luminance = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return luminance > 0.55 ? '#0f172a' : '#ffffff'
}

function toRgba(hex: string, alpha: number) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!match) return `rgba(100,116,139,${alpha})`
  const n = parseInt(match[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

function glow(color: string) {
  return `0 8px 24px ${toRgba(color, 0.4)}, inset 0 1px 0 rgba(255,255,255,0.45)`
}

export default function StageTabs({ dark, items, active, onSelect }: StageTabsProps) {
  const pt = getPulseTheme(dark)
  const reduced = usePrefersReducedMotion()
  const activeRef = useRef<HTMLButtonElement>(null)
  const activeColor = items.find(item => item.value === active)?.color ?? null
  const previousColor = useRef<string | null>(null)
  const blendFrom = previousColor.current

  useEffect(() => {
    previousColor.current = activeColor
  }, [activeColor])

  useEffect(() => {
    if (!active) return
    activeRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [active, reduced])

  const colorFade = reduced ? { duration: 0 } : { duration: 0.7, ease: 'easeInOut' as const }
  const highlightTransition = reduced
    ? { duration: 0 }
    : {
        layout: { type: 'spring' as const, stiffness: 420, damping: 34 },
        backgroundColor: colorFade,
        boxShadow: colorFade,
        opacity: { duration: 0.25 },
      }

  return (
    <div className="stage-tabs-wrap">
      <style>{`
        .stage-tabs-wrap { display: flex; justify-content: center; }
        .stage-tabs-track {
          display: flex; gap: 6px; padding: 8px; overflow-x: auto;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
        }
        .stage-tabs-track::-webkit-scrollbar { display: none; }
        .stage-tab {
          position: relative; flex: 0 0 auto; height: 50px; padding: 0 22px;
          border: none; border-radius: 999px; background: transparent;
          cursor: pointer; white-space: nowrap; scroll-snap-align: center;
          font-weight: 800; font-size: 14.5px; letter-spacing: 0.2px;
          transition: color 0.5s ease, background 0.2s ease;
        }
        .stage-tab-label { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 9px; }
        .stage-tab:not([aria-pressed="true"]):hover { background: var(--stage-tab-hover); }
        @media (max-width: 480px) {
          .stage-tab { height: 44px; padding: 0 16px; font-size: 13px; }
          .stage-tabs-track { padding: 6px; }
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
          {items.map(item => {
            const isActive = item.value === active
            const onColor = readableOn(item.color)
            const iconColor = isActive ? onColor : item.color
            return (
              <button
                key={item.value}
                ref={isActive ? activeRef : undefined}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelect(isActive ? null : item.value)}
                className="stage-tab glass-focus-ring"
                style={{ color: isActive ? onColor : pt.textPrimary, fontFamily: pulseFonts.body }}
              >
                {isActive && (
                  <motion.span
                    layoutId="stage-tab-active"
                    aria-hidden
                    initial={blendFrom
                      ? { backgroundColor: blendFrom, boxShadow: glow(blendFrom) }
                      : { opacity: 0 }}
                    animate={{ opacity: 1, backgroundColor: item.color, boxShadow: glow(item.color) }}
                    transition={highlightTransition}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: 999,
                      backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%)',
                    }}
                  />
                )}
                <span className="stage-tab-label">
                  {item.Icon
                    ? <item.Icon color={iconColor} size={18} />
                    : item.emoji ? <span style={{ fontSize: 16, lineHeight: 1 }}>{item.emoji}</span> : null}
                  {item.title}
                </span>
              </button>
            )
          })}
        </div>
      </PulseGlassRow>
    </div>
  )
}
