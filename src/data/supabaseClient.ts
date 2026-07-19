import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Supabase can be configured two ways:
//  1. Build-time env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) — good
//     for self-hosted builds.
//  2. Runtime, entered in-app (Settings → Sync) and stored in localStorage —
//     so a static deploy (e.g. GitHub Pages) can turn on live sync without a
//     rebuild or secrets in the repo.
// Runtime config wins when present.

const LS_KEY = 'mealmates.supabase'

export interface SupabaseConfig {
  url: string
  anonKey: string
}

function readStored(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as Partial<SupabaseConfig>
    if (o.url && o.anonKey) return { url: o.url, anonKey: o.anonKey }
  } catch {
    /* ignore malformed config */
  }
  return null
}

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const stored = typeof localStorage !== 'undefined' ? readStored() : null
const url = stored?.url ?? envUrl
const anonKey = stored?.anonKey ?? envKey

export const isSupabaseConfigured = Boolean(url && anonKey)
export const supabaseConfigSource: 'runtime' | 'env' | 'none' = stored
  ? 'runtime'
  : envUrl && envKey
    ? 'env'
    : 'none'

// Only create the client when configured, so the local adapter can run with
// no config at all.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null

// Persist (or clear) the runtime config. Callers should reload the app after
// changing it so the repository is re-created against the new backend.
export function setSupabaseConfig(config: SupabaseConfig | null): void {
  if (config) localStorage.setItem(LS_KEY, JSON.stringify(config))
  else localStorage.removeItem(LS_KEY)
}

export function getStoredSupabaseConfig(): SupabaseConfig | null {
  return readStored()
}

// The household this device is currently in (Supabase mode). Null until the
// user creates or joins one via the household gate.
const HH_KEY = 'mealmates.household'

export function getHouseholdId(): string | null {
  try {
    return localStorage.getItem(HH_KEY)
  } catch {
    return null
  }
}

export function setHouseholdId(id: string | null): void {
  if (id) localStorage.setItem(HH_KEY, id)
  else localStorage.removeItem(HH_KEY)
}

// Validate a URL + key by making one lightweight request. Returns a friendly
// error string on failure, or null on success. Times out fast so a wrong URL
// never leaves the UI hanging.
export async function testSupabaseConnection(
  config: SupabaseConfig,
): Promise<string | null> {
  try {
    const probe = createClient(config.url, config.anonKey)
    const timeout = new Promise<{ error: { message: string } }>((resolve) =>
      setTimeout(
        () => resolve({ error: { message: 'timeout' } }),
        10_000,
      ),
    )
    const { error } = await Promise.race([
      probe.from('settings').select('id').limit(1),
      timeout,
    ])
    if (error) return friendlyError(error.message)
    return null
  } catch (e) {
    return friendlyError(e instanceof Error ? e.message : '')
  }
}

function friendlyError(msg: string): string {
  if (!msg || /timeout|failed to fetch|networkerror|load failed|fetch failed/i.test(msg)) {
    return "Couldn't reach that project — double-check the URL."
  }
  // A missing table means the creds work but the schema isn't set up yet.
  if (/relation .*settings.* does not exist|does not exist|schema cache/i.test(msg)) {
    return 'Connected, but the tables are missing — run the setup SQL in your Supabase project first.'
  }
  if (/invalid api key|jwt|apikey/i.test(msg)) {
    return 'That anon key was rejected — copy it again from Supabase → Settings → API.'
  }
  return msg
}
