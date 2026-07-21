import { motion } from 'framer-motion'
import { BarChart3, CalendarDays, Dices, ListChecks, Utensils, Wallet } from 'lucide-react'
import { cn } from '../lib/cn'

export type Tab = 'decide' | 'plan' | 'vote' | 'foods' | 'money' | 'stats'

const TABS: { id: Tab; label: string; icon: typeof Dices; emoji: string }[] = [
  { id: 'decide', label: 'Decide', icon: Dices, emoji: '🎰' },
  { id: 'plan', label: 'Plan', icon: CalendarDays, emoji: '🗓️' },
  { id: 'vote', label: 'Vote', icon: ListChecks, emoji: '🗳️' },
  { id: 'foods', label: 'Foods', icon: Utensils, emoji: '🍲' },
  { id: 'money', label: 'Money', icon: Wallet, emoji: '💸' },
  { id: 'stats', label: 'Stats', icon: BarChart3, emoji: '📊' },
]

interface BottomNavProps {
  tab: Tab
  onChange: (t: Tab) => void
}

export function BottomNav({ tab, onChange }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-charcoal-100 bg-cream/90 backdrop-blur-lg dark:border-charcoal-800 dark:bg-charcoal-900/90 safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
        {TABS.map((t) => {
          const active = tab === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5"
              aria-label={t.label}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-x-1 inset-y-0 rounded-2xl bg-paprika-100 dark:bg-paprika-500/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <motion.span
                animate={{ scale: active ? 1.15 : 1, y: active ? -1 : 0 }}
                className="relative z-10"
              >
                <Icon
                  size={22}
                  className={cn(
                    active
                      ? 'text-paprika-600 dark:text-paprika-300'
                      : 'text-charcoal-800/60 dark:text-cream/50',
                  )}
                  strokeWidth={active ? 2.6 : 2}
                />
              </motion.span>
              <span
                className={cn(
                  'relative z-10 font-display text-[11px] font-bold',
                  active
                    ? 'text-paprika-600 dark:text-paprika-300'
                    : 'text-charcoal-800/60 dark:text-cream/50',
                )}
              >
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
