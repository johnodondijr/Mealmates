import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// A short build id so we can tell which deploy is actually loaded. Uses the CI
// commit sha when available, otherwise the build time.
const buildId = (process.env.GITHUB_SHA ?? '').slice(0, 7) || new Date().toISOString().slice(0, 16)

// https://vitejs.dev/config/
export default defineConfig({
  // Relative asset paths so the build works on any host / subpath
  // (GitHub Pages project site, Vercel, Netlify, etc.).
  base: './',
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
