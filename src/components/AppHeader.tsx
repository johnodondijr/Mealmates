import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Moon, Settings, Sun, UserPlus } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useTheme } from '../store/ThemeContext'
import { Avatar } from './ui/Avatar'
import { RequestsSheet } from './RequestsSheet'
import { chefFavoriteId } from '../engine/stats'

interface AppHeaderProps {
  onOpenSettings: () => void
}

export function AppHeader({ onOpenSettings }: AppHeaderProps) {
  const {
    data,
    currentMember,
    currentMemberId,
    setCurrentMemberId,
    onlineMemberIds,
    presenceEnabled,
    isAdmin,
    pendingRequests,
  } = useApp()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const [requestsOpen, setRequestsOpen] = useState(false)
  const chefId = chefFavoriteId(data)
  const requestCount = isAdmin ? pendingRequests.length : 0
  const online = new Set(onlineMemberIds)
  // Others (not me) currently online — drives the little "live" badge.
  const othersLive = onlineMemberIds.filter((id) => id !== currentMemberId).length

  return (
    <header className="sticky top-0 z-20 bg-cream/85 backdrop-blur-lg dark:bg-charcoal-950/85 safe-top">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-paprika-500 text-lg shadow-pop">
            🍲
          </span>
          <h1 className="font-logo text-[1.35rem] font-semibold leading-none tracking-tight text-charcoal-900 dark:text-cream">
            Meal<span className="text-paprika-500">Mates</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {requestCount > 0 && (
            <button
              onClick={() => setRequestsOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-charcoal-900 shadow-card ring-1 ring-charcoal-900/[0.04] transition-transform active:scale-95 dark:bg-charcoal-800 dark:text-cream dark:ring-white/[0.06]"
              aria-label="Join requests"
            >
              <UserPlus size={19} />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-cream dark:ring-charcoal-950">
                {requestCount}
              </span>
            </button>
          )}
          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-charcoal-900 shadow-card ring-1 ring-charcoal-900/[0.04] transition-transform active:scale-95 dark:bg-charcoal-800 dark:text-cream dark:ring-white/[0.06]"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button
            onClick={onOpenSettings}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-charcoal-900 shadow-card ring-1 ring-charcoal-900/[0.04] transition-transform active:scale-95 dark:bg-charcoal-800 dark:text-cream dark:ring-white/[0.06]"
            aria-label="Settings"
          >
            <Settings size={19} />
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative ml-0.5 rounded-full ring-2 ring-white transition-transform active:scale-95 dark:ring-charcoal-800"
            aria-label="Switch profile"
          >
            {currentMember && (
              <Avatar member={currentMember} size={40} crown={chefId === currentMemberId} />
            )}
            {presenceEnabled && othersLive > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-avocado-500 px-1 text-[9px] font-bold text-white ring-2 ring-cream dark:ring-charcoal-950">
                {othersLive}
              </span>
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
                {presenceEnabled ? `Who's tapping? · ${online.size} live` : "Who's tapping?"}
              </p>
              {data.members.map((m) => {
                const isLive = presenceEnabled && online.has(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setCurrentMemberId(m.id)
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <span className="relative">
                      <Avatar member={m} size={32} crown={chefId === m.id} />
                      {isLive && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-avocado-500 ring-2 ring-white dark:ring-charcoal-800" />
                      )}
                    </span>
                    <span className="flex-1 font-display font-bold text-charcoal-900 dark:text-cream">
                      {m.name}
                    </span>
                    {isLive && m.id !== currentMemberId && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-avocado-600">
                        live
                      </span>
                    )}
                    {m.id === currentMemberId && (
                      <Check size={18} className="text-paprika-500" />
                    )}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {requestsOpen && <RequestsSheet onClose={() => setRequestsOpen(false)} />}
    </header>
  )
}
