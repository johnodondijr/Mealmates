import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

interface CountUpProps {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}

// Animated number count-up for stats.
export function CountUp({ value, duration = 900, format, className }: CountUpProps) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(reduce ? value : 0)
  const fromRef = useRef(0)
  const rafRef = useRef<number>()

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      return
    }
    const from = fromRef.current
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (value - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = value
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = value
    }
  }, [value, duration, reduce])

  return (
    <span className={className}>
      {format ? format(display) : Math.round(display).toLocaleString()}
    </span>
  )
}
