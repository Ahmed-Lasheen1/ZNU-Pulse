"use client"

import { useState, type CSSProperties, type ReactNode, type KeyboardEvent } from "react"
import { motion } from "framer-motion"
import { ENTRANCE_PAUSE } from "@/lib/pulseMotion"
import { liquidGlassShadow, liquidGlassBackdrop, liquidGlassTint } from "@/lib/liquidGlass"

interface LiquidGlassCardProps {
  children: ReactNode
  dark?: boolean
  onClick?: () => void
  delay?: number
  className?: string
  style?: CSSProperties
  // When true, skips the entrance animation entirely and renders
  // straight into its final (opacity:1, y:0) state — used by Home.tsx
  // via useOncePerSession so the staggered reveal only plays once per
  // browser tab session, not on every navigation back to Home. This
  // was previously passed from Home.tsx but silently ignored here
  // since it was never declared or read, so every card replayed its
  // full entrance animation on every single mount regardless.
  instant?: boolean
}

export default function LiquidGlassCard({
  children,
  dark,
  onClick,
  delay = 0,
  className,
  style = {},
  instant = false,
}: LiquidGlassCardProps) {
  const interactive = !!onClick
  const [hovered, setHovered] = useState(false)

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!interactive) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick?.()
    }
  }

  const { borderRadius = 18, ...contentStyle } = style as CSSProperties & { borderRadius?: number | string }
  const entranceDelay = ENTRANCE_PAUSE + (delay / 1000) * 1.5

  const rootClassName = interactive
    ? [className, 'glass-focus-ring'].filter(Boolean).join(' ')
    : className

  return (
    <motion.div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
      className={rootClassName}
      style={{ position: 'relative', cursor: interactive ? 'pointer' : 'default', borderRadius }}
      // `initial={false}` when `instant` is set skips Framer Motion's
      // "from" state entirely and renders directly into whatever
      // `animate` resolves to — the same pattern PulseBrand.tsx and
      // NavMenu.jsx already use for exactly this purpose. Real
      // open/entrance transitions (instant=false, the default) are
      // completely unaffected.
      initial={instant ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={instant ? { duration: 0 } : { duration: 0.75, delay: entranceDelay, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <div
        style={{
          position: 'relative',
          isolation: 'isolate',
          overflow: 'hidden',
          borderRadius,
          transform: hovered && interactive ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.3s ease',
          ...liquidGlassBackdrop(),
          // AUDIT FIX (content clipping): this box is the actual
          // visible glass card — it now receives the caller's FULL
          // style (padding, minHeight, display, boxShadow, etc.)
          // directly, instead of that style landing one level deeper
          // on a plain content div while THIS box (the one that
          // actually has `overflow: hidden`) stayed hard-locked to
          // `height: 100%` with no awareness of how much content was
          // actually inside it. `minHeight: '100%'` (not `height`)
          // keeps every existing equal-height-row-in-a-grid layout
          // (ModulePage/StagePage/Summaries card grids, etc.) working
          // exactly as before when content is short, but now lets the
          // box grow taller than that whenever a question, an answer
          // option, or an explanation actually needs more room —
          // nothing gets clipped at this box's own overflow boundary
          // just because it "was" a fixed height.
          height: 'auto',
          minHeight: '100%',
          ...contentStyle,
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, zIndex: 0, borderRadius: 'inherit',
            pointerEvents: 'none',
            boxShadow: liquidGlassShadow(!!dark),
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, zIndex: 0, borderRadius: 'inherit',
            pointerEvents: 'none',
            background: liquidGlassTint(!!dark),
          }}
        />

        <div style={{ position: 'relative', zIndex: 10 }}>
          {children}
        </div>
      </div>
    </motion.div>
  )
}
