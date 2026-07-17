import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AppHeader } from './components/AppHeader'
import { BottomNav, type Tab } from './components/BottomNav'
import { DecideScreen } from './screens/DecideScreen'
import { VoteScreen } from './screens/VoteScreen'
import { FoodsScreen } from './screens/FoodsScreen'
import { MoneyScreen } from './screens/MoneyScreen'
import { StatsScreen } from './screens/StatsScreen'
import { SettingsScreen } from './screens/SettingsScreen'

const SCREENS: Record<Tab, () => JSX.Element> = {
  decide: DecideScreen,
  vote: VoteScreen,
  foods: FoodsScreen,
  money: MoneyScreen,
  stats: StatsScreen,
}

export default function App() {
  const [tab, setTab] = useState<Tab>('decide')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const reduce = useReducedMotion()
  const Screen = SCREENS[tab]

  return (
    <div className="min-h-screen bg-cream text-charcoal-900 dark:bg-charcoal-950 dark:text-cream">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <AppHeader onOpenSettings={() => setSettingsOpen(true)} />

        <main className="flex-1 pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Screen />
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav tab={tab} onChange={setTab} />
      </div>

      <AnimatePresence>
        {settingsOpen && <SettingsScreen onClose={() => setSettingsOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
