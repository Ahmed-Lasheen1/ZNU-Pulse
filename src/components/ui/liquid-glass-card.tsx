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
          height: '100%',
          transform: hovered && interactive ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.3s ease',
          ...liquidGlassBackdrop(),
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

        <div style={{ position: 'relative', zIndex: 10, ...contentStyle }}>
          {children}
        </div>
      </div>
    </motion.div>
  )
}
