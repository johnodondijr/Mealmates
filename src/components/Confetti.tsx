import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

const COLORS = ['#6EA630', '#F5B10A', '#42691C', '#A1CC6A', '#22201B']

interface Piece {
  id: number
  x: number
  rotate: number
  delay: number
  color: string
  size: number
}

interface ConfettiProps {
  fire: boolean
  pieces?: number
  onDone?: () => void
}

// Lightweight DOM confetti burst — no canvas dependency.
export function Confetti({ fire, pieces = 80, onDone }: ConfettiProps) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(false)

  const items = useMemo<Piece[]>(
    () =>
      Array.from({ length: pieces }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        rotate: Math.random() * 360,
        delay: Math.random() * 0.2,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 8,
      })),
    [pieces],
  )

  useEffect(() => {
    if (fire && !reduce) {
      setActive(true)
      const t = setTimeout(() => {
        setActive(false)
        onDone?.()
      }, 2200)
      return () => clearTimeout(t)
    }
    if (fire && reduce) onDone?.()
  }, [fire, reduce, onDone])

  return (
    <AnimatePresence>
      {active && (
        <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
          {items.map((p) => (
            <motion.div
              key={p.id}
              className="absolute top-0"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size * 1.4,
                backgroundColor: p.color,
                borderRadius: 2,
              }}
              initial={{ y: -20, opacity: 1, rotate: p.rotate }}
              animate={{
                y: '105vh',
                rotate: p.rotate + 360,
                opacity: [1, 1, 0.9, 0],
              }}
              transition={{ duration: 1.8 + Math.random(), delay: p.delay, ease: 'easeIn' }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
