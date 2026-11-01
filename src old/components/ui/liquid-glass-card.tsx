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
  // Only Home opts out of this (instant={!playEntrance}) to play its
  // staggered reveal once per tab session. Every other page renders
  // straight into its final state by default — no reason to pay the
  // Home-only entrance pause on ordinary navigations.
  instant?: boolean
}

export default function LiquidGlassCard({
  children,
  dark,
  onClick,
  delay = 0,
  className,
  style = {},
  instant = true,
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
