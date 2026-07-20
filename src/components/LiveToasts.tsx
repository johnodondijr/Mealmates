import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../store/AppContext'
import { Avatar } from './ui/Avatar'
import type { Member } from '../types'

// Live toasts: when another housemate logs a meal (spins & eats, or picks a
// plate), everyone with the app open sees "<name> picked <meal> for <slot>".
// Only meals that arrive *after* this device loaded are announced — never the
// backlog, and never your own picks.

interface Toast {
  key: string
  member?: Member
  text: string
}

const SLOT_WORD: Record<string, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
}

export function LiveToasts() {
  const { data, currentMemberId, presenceEnabled } = useApp()
  const known = useRef<Set<string> | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    // Only meaningful in a synced household with other people around.
    if (!presenceEnabled) return

    const ids = data.meals.map((m) => m.id)
    // First pass just records the baseline — don't announce existing meals.
    if (known.current === null) {
      known.current = new Set(ids)
      return
    }

    const seen = known.current
    const fresh = data.meals.filter((m) => !seen.has(m.id))
    fresh.forEach((m) => seen.add(m.id))

    const now = Date.now()
    const announce = fresh.filter(
      (m) =>
        m.logged_by !== currentMemberId &&
        // guard against a resync surfacing an old row
        now - new Date(m.created_at).getTime() < 2 * 60 * 1000,
    )
    if (announce.length === 0) return

    const newToasts: Toast[] = announce.map((m) => {
      const who = data.members.find((mm) => mm.id === m.logged_by)
      return {
        key: m.id,
        member: who,
        text: `${who?.name ?? 'Someone'} picked ${m.label} for ${SLOT_WORD[m.slot] ?? m.slot}`,
      }
    })

    setToasts((prev) => [...prev, ...newToasts].slice(-3))
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(25)
      } catch {
        /* ignore */
      }
    }
    for (const t of newToasts) {
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.key !== t.key)), 5200)
    }
  }, [data.meals, data.members, currentMemberId, presenceEnabled])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.key}
            layout
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            onClick={() => setToasts((prev) => prev.filter((x) => x.key !== t.key))}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-charcoal-900/95 px-3.5 py-3 text-left shadow-pop backdrop-blur dark:bg-charcoal-800/95"
          >
            {t.member ? (
              <Avatar member={t.member} size={34} />
            ) : (
              <span className="text-xl">🍽️</span>
            )}
            <p className="flex-1 text-sm font-semibold leading-snug text-cream">
              <span aria-hidden className="mr-1">
                🍽️
              </span>
              {t.text}
            </p>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
