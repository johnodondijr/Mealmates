import { useState } from 'react'
import { Loader2, Link2, Link2Off, ExternalLink, Cloud } from 'lucide-react'
import { Button } from './ui/Button'
import {
  isSupabaseConfigured,
  supabaseConfigSource,
  getStoredSupabaseConfig,
  setSupabaseConfig,
  testSupabaseConnection,
  isLocalOnly,
  setLocalOnly,
} from '../data/supabaseClient'

// Repo file with the one-paste setup SQL for a fresh Supabase project.
const SCHEMA_URL =
  'https://github.com/johnodondijr/Mealmates/blob/main/supabase/schema.sql'

export function SyncSettings() {
  const stored = getStoredSupabaseConfig()
  const [url, setUrl] = useState(stored?.url ?? '')
  const [anonKey, setAnonKey] = useState(stored?.anonKey ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The user chose local-only even though sync is available — offer to turn it
  // back on.
  if (isLocalOnly()) {
    const enableSync = () => {
      setLocalOnly(false)
      window.location.reload()
    }
    return (
      <Button fullWidth onClick={enableSync}>
        <Cloud size={18} /> Turn on sync
      </Button>
    )
  }

  // Sync is built in (baked project) or set via env vars — nothing to type.
  if (isSupabaseConfigured && (supabaseConfigSource === 'env' || supabaseConfigSource === 'baked')) {
    return (
      <p className="text-xs font-semibold text-charcoal-800/50 dark:text-cream/40">
        {supabaseConfigSource === 'baked'
          ? 'Live sync is built in — just share your household code.'
          : 'Configured with build-time environment variables.'}
      </p>
    )
  }

  // Connected via in-app config — offer to disconnect.
  if (isSupabaseConfigured && supabaseConfigSource === 'runtime') {
    const disconnect = () => {
      setSupabaseConfig(null)
      window.location.reload()
    }
    return (
      <Button variant="secondary" fullWidth onClick={disconnect}>
        <Link2Off size={18} /> Disconnect &amp; use this device only
      </Button>
    )
  }

  // Not connected — collect URL + anon key and connect.
  const connect = async () => {
    const cfg = { url: url.trim().replace(/\/+$/, ''), anonKey: anonKey.trim() }
    if (!cfg.url || !cfg.anonKey) {
      setError('Enter both the project URL and the anon key.')
      return
    }
    setBusy(true)
    setError(null)
    const err = await testSupabaseConnection(cfg)
    if (err && !err.startsWith('Connected, but the tables are missing')) {
      setBusy(false)
      setError(err)
      return
    }
    // Save and reload so the repository re-initialises against Supabase. (A
    // missing-tables warning still connects — seeding happens on first load.)
    setSupabaseConfig(cfg)
    window.location.reload()
  }

  return (
    <div className="space-y-2">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://YOUR-PROJECT.supabase.co"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-charcoal-900 shadow-card outline-none ring-paprika-300 focus:ring-2 dark:bg-charcoal-800 dark:text-cream"
      />
      <input
        value={anonKey}
        onChange={(e) => setAnonKey(e.target.value)}
        placeholder="anon public key"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-charcoal-900 shadow-card outline-none ring-paprika-300 focus:ring-2 dark:bg-charcoal-800 dark:text-cream"
      />
      {error && (
        <p className="px-1 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
      )}
      <Button fullWidth onClick={connect} disabled={busy}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Link2 size={18} />}
        {busy ? 'Connecting…' : 'Connect & sync'}
      </Button>
      <a
        href={SCHEMA_URL}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1.5 py-1 text-xs font-semibold text-charcoal-800/50 hover:text-paprika-600 dark:text-cream/45"
      >
        <ExternalLink size={13} /> First time? Run the setup SQL in your project
      </a>
    </div>
  )
}
