import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Food } from '../types'
import { cn } from '../lib/cn'

const ITEM_H = 104 // px per reel item

// Food emojis each empty slot gently cycles through while idle — a hint at what
// belongs there, keyed by the reel's label.
const IDLE_EMOJIS: Record<string, string[]> = {
  Base: ['🍚', '🌽', '🥔', '🍝', '🫓'],
  Protein: ['🍗', '🥩', '🐟', '🫘', '🥚'],
  Veg: ['🥬', '🥦', '🥕', '🌿', '🍅'],
  Drink: ['🍵', '☕', '🥛', '🥣', '🧃'],
  Breakfast: ['🍞', '🥚', '🥞', '🍩', '🥜'],
}

// An idle slot: a food emoji that floats and slowly cross-fades to the next,
// staggered per reel so the row reads as a soft wave.
function IdleSlot({ label, delay, reduce }: { label: string; delay: number; reduce: boolean }) {
  const emojis = IDLE_EMOJIS[label] ?? ['🍽️']
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduce || emojis.length < 2) return
    let interval: ReturnType<typeof setInterval> | undefined
    // Offset each reel's cycle so they don't flip in unison.
    const start = setTimeout(() => {
      setI((n) => (n + 1) % emojis.length)
      interval = setInterval(() => setI((n) => (n + 1) % emojis.length), 2000)
    }, delay * 1000)
    return () => {
      clearTimeout(start)
      if (interval) clearInterval(interval)
    }
  }, [reduce, emojis.length, delay])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5">
      <motion.div
        className="flex h-11 w-11 items-center justify-center"
        animate={reduce ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={emojis[i]}
              className="absolute text-[2rem] leading-none"
              initial={{ opacity: 0, y: 7, scale: 0.7 }}
              animate={{ opacity: 0.55, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -7, scale: 0.7 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {emojis[i]}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>
      <span className="font-display text-[0.7rem] font-bold uppercase tracking-wide text-charcoal-800/40 dark:text-cream/40">
        {label}
      </span>
    </div>
  )
}

interface ReelProps {
  pool: Food[]
  target: Food | undefined
  label: string
  spinning: boolean
  delay: number
  onStop?: () => void
  onSwap?: () => void
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

function Reel({ pool, target, label, spinning, delay, onStop, onSwap }: ReelProps) {
  const reduce = useReducedMotion()
  const strip = useMemo(
    () => buildStrip(pool, target),
    // rebuild whenever we start a new spin toward a new target
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target?.id, spinning],
  )
  const finalIndex = strip.length - 1
  const restY = -(finalIndex * ITEM_H)
  const idle = !target && !spinning
  const landed = !!target && !spinning

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white ring-1 transition-all duration-300 dark:bg-charcoal-950',
        landed
          ? 'ring-2 ring-paprika-400 dark:ring-paprika-500/50'
          : 'ring-charcoal-900/[0.05] dark:ring-white/[0.06]',
      )}
      style={{ height: ITEM_H }}
    >
      {idle ? (
        <IdleSlot label={label} delay={delay} reduce={!!reduce} />
      ) : (
        <motion.div
          initial={false}
          animate={{ y: spinning && !reduce ? [0, restY] : restY }}
          transition={
            spinning && !reduce
              ? { duration: 1.7 + delay, ease: [0.12, 0.7, 0.2, 1] }
              : { duration: 0 }
          }
          onAnimationComplete={() => {
            if (spinning) onStop?.()
          }}
        >
          {strip.map((food, i) => {
            const isTarget = landed && i === finalIndex
            return (
              <div
                key={i}
                className="flex flex-col items-center justify-center gap-1"
                style={{ height: ITEM_H }}
              >
                <motion.span
                  className="text-[2.6rem] leading-none"
                  animate={isTarget && !reduce ? { scale: [0.7, 1.15, 1] } : {}}
                  transition={{ duration: 0.35 }}
                >
                  {food.emoji}
                </motion.span>
                <span className="max-w-[6.5rem] truncate px-1 text-center font-display text-[0.72rem] font-bold text-charcoal-800 dark:text-cream">
                  {food.name}
                </span>
              </div>
            )
          })}
        </motion.div>
      )}

      {/* Swap just this part — top-right so it never sits on the name */}
      {landed && onSwap && (
        <button
          onClick={onSwap}
          aria-label={`Swap ${label}`}
          className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-charcoal-900/85 text-white shadow-pop active:scale-90 dark:bg-cream dark:text-charcoal-950"
        >
          <RefreshCw size={13} strokeWidth={2.6} />
        </button>
      )}

      {/* soft top/bottom fades to sell the reel depth */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-black/[0.06] to-transparent dark:from-black/40" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/[0.06] to-transparent dark:from-black/40" />
    </div>
  )
}

export interface ReelSpec {
  pool: Food[]
  target?: Food
  label: string
  spinning: boolean
}

interface SlotMachineProps {
  reels: ReelSpec[]
  onReelStopped?: (index: number) => void
  onSwap?: (index: number) => void
}

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
}

export function SlotMachine({ reels, onReelStopped, onSwap }: SlotMachineProps) {
  const count = reels.length
  return (
    <div className={`grid gap-2 ${GRID_COLS[count] ?? 'grid-cols-3'}`}>
      {reels.map((r, i) => (
        <Reel
          key={i}
          pool={r.pool}
          target={r.target}
          label={r.label}
          spinning={r.spinning}
          delay={i * 0.28}
          onStop={() => onReelStopped?.(i)}
          onSwap={onSwap ? () => onSwap(i) : undefined}
        />
      ))}
    </div>
  )
}
