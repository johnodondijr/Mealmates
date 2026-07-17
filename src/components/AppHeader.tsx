import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Moon, Settings, Sun } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useTheme } from '../store/ThemeContext'
import { Avatar } from './ui/Avatar'
import { chefFavoriteId } from '../engine/stats'

interface AppHeaderProps {
  onOpenSettings: () => void
}

export function AppHeader({ onOpenSettings }: AppHeaderProps) {
  const { data, currentMember, currentMemberId, setCurrentMemberId } = useApp()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const chefId = chefFavoriteId(data)

  return (
    <header className="sticky top-0 z-20 bg-cream/85 backdrop-blur-lg dark:bg-charcoal-950/85 safe-top">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍲</span>
          <div className="leading-none">
            <h1 className="font-display text-xl font-extrabold text-charcoal-900 dark:text-cream">
              MealMates
            </h1>
            <p className="text-[11px] font-semibold text-charcoal-800/50 dark:text-cream/40">
              {data.settings.household_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggle}
            className="rounded-full p-2 text-charcoal-800 hover:bg-black/5 dark:text-cream dark:hover:bg-white/10"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={onOpenSettings}
            className="rounded-full p-2 text-charcoal-800 hover:bg-black/5 dark:text-cream dark:hover:bg-white/10"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="ml-0.5"
            aria-label="Switch profile"
          >
            {currentMember && (
              <Avatar member={currentMember} size={38} crown={chefId === currentMemberId} />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className="absolute right-4 z-20 mt-1 w-56 overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl dark:bg-charcoal-800"
            >
              <p className="px-3 py-2 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
                Who's tapping?
              </p>
              {data.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setCurrentMemberId(m.id)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <Avatar member={m} size={32} crown={chefId === m.id} />
                  <span className="flex-1 font-display font-bold text-charcoal-900 dark:text-cream">
                    {m.name}
                  </span>
                  {m.id === currentMemberId && (
                    <Check size={18} className="text-paprika-500" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
