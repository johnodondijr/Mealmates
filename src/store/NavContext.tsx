import { createContext, useContext, type ReactNode } from 'react'
import type { Tab } from '../components/BottomNav'

interface NavValue {
  tab: Tab
  setTab: (t: Tab) => void
}

const NavContext = createContext<NavValue | null>(null)

export function NavProvider({
  value,
  children,
}: {
  value: NavValue
  children: ReactNode
}) {
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav(): NavValue {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}
