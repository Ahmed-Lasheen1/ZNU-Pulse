"use client"

import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react"
import { useInView, useMotionValue, useSpring } from "framer-motion"

import { cn } from "@/shared/utils/cn"

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  style,
}: {
  value: number
  direction?: "up" | "down"
  className?: string
  delay?: number // delay in s
  decimalPlaces?: number
  style?: CSSProperties
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === "down" ? value : 0)
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  })
  const isInView = useInView(ref, { once: true, margin: "0px" })

  const format = (n: number) =>
    Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(n.toFixed(decimalPlaces)))

  // Shows the starting number right away; the spring only emits on change, so a 0 would stay blank.
  useLayoutEffect(() => {
    if (ref.current) ref.current.textContent = format(motionValue.get())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isInView) return
    const timeout = setTimeout(() => {
      motionValue.set(direction === "down" ? 0 : value)
    }, delay * 1000)
    return () => clearTimeout(timeout)
  }, [motionValue, isInView, delay, value, direction])

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) ref.current.textContent = format(latest)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [springValue, decimalPlaces],
  )

  return (
    <span
      className={cn("inline-block tabular-nums tracking-wider", className)}
      style={style}
      ref={ref}
    />
  )
}
