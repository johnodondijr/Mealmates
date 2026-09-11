import type { Tab } from '../components/BottomNav'

type Theme = 'light' | 'dark'

interface ChromeColors {
  canvas: string
  top: string
  bottom: string
}

const LIGHT_CHROME: Record<Tab, ChromeColors> = {
  decide: { canvas: '#EBE7E0', top: '#EBE7E0', bottom: '#EBE7E0' },
  plan: { canvas: '#F5EEDF', top: '#FEF7E2', bottom: '#EBE7E0' },
  vote: { canvas: '#E9F3DD', top: '#EEF6E3', bottom: '#E9F3DD' },
  foods: { canvas: '#EEEAE2', top: '#EBE7E0', bottom: '#EEEAE2' },
  money: { canvas: '#EAF2E0', top: '#EEF6E3', bottom: '#EAF2E0' },
  stats: { canvas: '#F0E6D8', top: '#F5E7D5', bottom: '#F0E6D8' },
}

const DARK_CHROME: Record<Tab, ChromeColors> = {
  decide: { canvas: '#161410', top: '#161410', bottom: '#161410' },
  plan: { canvas: '#181713', top: '#1B1913', bottom: '#181713' },
  vote: { canvas: '#121710', top: '#141A11', bottom: '#121710' },
  foods: { canvas: '#161410', top: '#161410', bottom: '#161410' },
  money: { canvas: '#121710', top: '#141A11', bottom: '#121710' },
  stats: { canvas: '#19140F', top: '#1D160F', bottom: '#19140F' },
}

declare global {
  interface Window {
    MealMatesChrome?: {
      setBars: (topColor: string, bottomColor: string, lightSystemBars: boolean) => void
    }
  }
}

function ensureThemeMeta(): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  return meta
}

export function getChromeColors(tab: Tab, theme: Theme): ChromeColors {
  return theme === 'dark' ? DARK_CHROME[tab] : LIGHT_CHROME[tab]
}

export function applySystemChrome(tab: Tab, theme: Theme) {
  const colors = getChromeColors(tab, theme)
  const root = document.documentElement

  root.style.setProperty('--app-canvas', colors.canvas)
  root.style.setProperty('--app-chrome-top', colors.top)
  root.style.setProperty('--app-chrome-bottom', colors.bottom)
  ensureThemeMeta().content = colors.top

  window.MealMatesChrome?.setBars(colors.top, colors.bottom, theme === 'light')
}
