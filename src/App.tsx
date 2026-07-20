import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AppHeader } from './components/AppHeader'
import { BottomNav, type Tab } from './components/BottomNav'
import { DecideScreen } from './screens/DecideScreen'
import { VoteScreen } from './screens/VoteScreen'
import { FoodsScreen } from './screens/FoodsScreen'
import { MoneyScreen } from './screens/MoneyScreen'
import { StatsScreen } from './screens/StatsScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { Onboarding } from './components/Onboarding'
import { LiveToasts } from './components/LiveToasts'
import { NavProvider } from './store/NavContext'
import { useApp } from './store/AppContext'

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

  const { data } = useApp()
  const [showOnboarding, setShowOnboarding] = useState(false)
  useEffect(() => {
    if (localStorage.getItem('mealmates.onboarded') === '1') return
    // Existing households (already customised / have history) shouldn't be
    // shown the first-run flow — quietly mark them as onboarded.
    const looksUsed =
      data.members.length > 1 ||
      data.meals.length > 0 ||
      data.expenses.length > 0 ||
      data.settings.household_name !== 'My Household'
    if (looksUsed) {
      localStorage.setItem('mealmates.onboarded', '1')
    } else {
      setShowOnboarding(true)
    }
  }, [data])

  return (
    <NavProvider value={{ tab, setTab }}>
    <div className="min-h-screen bg-cream text-charcoal-900 dark:bg-charcoal-950 dark:text-cream">
      <LiveToasts />
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <AppHeader onOpenSettings={() => setSettingsOpen(true)} />

        <main className="flex-1 pb-28">
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

      <AnimatePresence>
        {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      </AnimatePresence>
    </div>
    </NavProvider>
  )
}
