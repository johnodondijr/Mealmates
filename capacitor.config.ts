import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.mealmates.app',
  appName: 'MealMates',
  // Vite builds to dist/ (see vite.config.ts). Capacitor copies this into the
  // native Android project on `cap sync`.
  webDir: 'dist',
  android: {
    // Show a background while the web view boots so the app never flashes white.
    backgroundColor: '#EBE7E0',
  },
}

export default config
