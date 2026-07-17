import type { Repository } from './repository'
import { LocalRepository } from './localRepository'
import { SupabaseRepository } from './supabaseRepository'
import { supabase, isSupabaseConfigured } from './supabaseClient'

// Pick the adapter once. If Supabase env vars are present we use it (with
// Realtime); otherwise we fall back to the fully-working localStorage adapter.
export function createRepository(): Repository {
  if (isSupabaseConfigured && supabase) {
    return new SupabaseRepository(supabase)
  }
  return new LocalRepository()
}

export const usingSupabase = isSupabaseConfigured

export type { Repository }
