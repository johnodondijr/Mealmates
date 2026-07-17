import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import type { Food } from '../types'

const ITEM_H = 96 // px per reel item

interface ReelProps {
  pool: Food[]
  target: Food | undefined
  spinning: boolean
  delay: number
  onStop?: () => void
}

function buildStrip(pool: Food[], target: Food | undefined): Food[] {
  if (!target) return pool.slice(0, 12)
  const strip: Food[] = []
  for (let i = 0; i < 24; i++) {
    strip.push(pool[Math.floor(Math.random() * pool.length)])
  }
  strip.push(target) // land on target (last item)
  return strip
}

function Reel({ pool, target, spinning, delay, onStop }: ReelProps) {
  const reduce = useReducedMotion()
  const strip = useMemo(
    () => buildStrip(pool, target),
    // rebuild whenever we start a new spin toward a new target
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target?.id, spinning],
  )
  const finalIndex = strip.length - 1
  const restY = -(finalIndex * ITEM_H)

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-cream shadow-inner ring-2 ring-paprika-200 dark:bg-charcoal-950 dark:ring-charcoal-800"
      style={{ height: ITEM_H }}
    >
      <motion.div
        initial={false}
        animate={{ y: spinning && !reduce ? [0, restY] : restY }}
        transition={
          spinning && !reduce
            ? { duration: 1.6 + delay, ease: [0.15, 0.8, 0.3, 1] }
            : { duration: 0 }
        }
        // Only report a stop for a real spin — avoids firing on mount / rest.
        onAnimationComplete={() => {
          if (spinning) onStop?.()
        }}
      >
        {strip.map((food, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center"
            style={{ height: ITEM_H }}
          >
            <span className="text-4xl">{food.emoji}</span>
            <span className="mt-0.5 max-w-[6rem] truncate px-1 text-center font-display text-xs font-bold text-charcoal-800 dark:text-cream">
              {food.name}
            </span>
          </div>
        ))}
      </motion.div>
      {/* subtle center highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black/10 to-transparent dark:from-black/40" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/10 to-transparent dark:from-black/40" />
    </div>
  )
}

export interface ReelSpec {
  pool: Food[]
  target?: Food
}

interface SlotMachineProps {
  reels: ReelSpec[]
  spinning: boolean
  onAllStopped?: () => void
}

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
}

export function SlotMachine({ reels, spinning, onAllStopped }: SlotMachineProps) {
  const stoppedRef = useRef(0)
  const count = reels.length

  useEffect(() => {
    if (spinning) stoppedRef.current = 0
  }, [spinning, reels])

  const handleStop = () => {
    stoppedRef.current += 1
    if (stoppedRef.current >= count) onAllStopped?.()
  }

  return (
    <div className={`grid gap-2 ${GRID_COLS[count] ?? 'grid-cols-3'}`}>
      {reels.map((r, i) => (
        <Reel
          key={i}
          pool={r.pool}
          target={r.target}
          spinning={spinning}
          delay={i * 0.25}
          onStop={handleStop}
        />
      ))}
    </div>
  )
}
