import type { Repository } from './repository'
import { LocalRepository } from './localRepository'
import { SupabaseRepository } from './supabaseRepository'
import {
  supabase,
  isSupabaseConfigured,
  getHouseholdId,
} from './supabaseClient'

// Pick the adapter once. If Supabase env vars/config are present we use it
// (with Realtime), scoped to the household this device has joined. With no
// config we fall back to the fully-working localStorage adapter.
export function createRepository(): Repository {
  const householdId = getHouseholdId()
  if (isSupabaseConfigured && supabase && householdId) {
    return new SupabaseRepository(supabase, householdId)
  }
  return new LocalRepository()
}

export const usingSupabase = isSupabaseConfigured

// True when Supabase is configured but this device hasn't created/joined a
// household yet — the app should show the household gate instead of the repo.
export function needsHousehold(): boolean {
  return isSupabaseConfigured && !getHouseholdId()
}

export type { Repository }
