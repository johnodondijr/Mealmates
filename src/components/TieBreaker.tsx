import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { VoteOption } from '../types'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'

interface TieBreakerProps {
  options: VoteOption[]
  onClose: () => void
  onResult: (option: VoteOption) => void
}

const SEGMENT_COLORS = ['#6EA630', '#F5B10A', '#42691C', '#A1CC6A']

// A dramatic spinning wheel so ties never cause arguments.
export function TieBreaker({ options, onClose, onResult }: TieBreakerProps) {
  const reduce = useReducedMotion()
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [winner, setWinner] = useState<VoteOption | null>(null)

  const n = options.length
  const seg = 360 / n

  const spin = () => {
    const pick = Math.floor(Math.random() * n)
    // Pointer is at top (0deg). Land the picked segment's center under it.
    const target = 360 * 5 + (360 - (pick * seg + seg / 2))
    setSpinning(true)
    setWinner(null)
    setRotation(target)
    const delay = reduce ? 0 : 3200
    setTimeout(() => {
      setSpinning(false)
      setWinner(options[pick])
    }, delay)
  }

  useEffect(() => {
    const t = setTimeout(spin, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Sheet open onClose={onClose} title="Tie-breaker! 🎡">
      <p className="mb-4 text-center text-sm font-semibold text-charcoal-800/60 dark:text-cream/50">
        It's a dead heat. The wheel decides — no arguments.
      </p>

      <div className="relative mx-auto aspect-square w-64">
        {/* pointer */}
        <div className="absolute left-1/2 top-[-6px] z-20 -translate-x-1/2 text-3xl">
          🔻
        </div>
        <motion.div
          className="h-full w-full rounded-full shadow-pop"
          style={{
            background: `conic-gradient(${options
              .map(
                (_, i) =>
                  `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} ${i * seg}deg ${
                    (i + 1) * seg
                  }deg`,
              )
              .join(', ')})`,
          }}
          animate={{ rotate: rotation }}
          transition={{ duration: reduce ? 0 : 3.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {options.map((o, i) => {
            const angle = i * seg + seg / 2
            return (
              <div
                key={o.id}
                className="absolute left-1/2 top-1/2 origin-left"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <span
                  className="inline-block max-w-[5.5rem] translate-x-8 truncate text-[11px] font-bold text-white drop-shadow"
                  style={{ transform: `rotate(90deg)` }}
                >
                  {o.label.split(' + ')[0]}
                </span>
              </div>
            )
          })}
        </motion.div>
        {/* hub */}
        <div className="absolute left-1/2 top-1/2 z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg dark:bg-charcoal-800" />
      </div>

      <div className="mt-6 min-h-[3rem] text-center">
        {winner ? (
          <motion.p
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-display text-xl font-extrabold text-paprika-600 dark:text-paprika-300"
          >
            🎉 {winner.label}!
          </motion.p>
        ) : (
          <p className="font-display text-lg font-bold text-charcoal-800/50 dark:text-cream/40">
            {spinning ? 'Spinning…' : 'Get ready…'}
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={spin} disabled={spinning} className="flex-1">
          Spin again
        </Button>
        <Button
          onClick={() => winner && onResult(winner)}
          disabled={!winner}
          className="flex-1"
        >
          Lock it in ✅
        </Button>
      </div>
    </Sheet>
  )
}
