import type { SupabaseClient } from '@supabase/supabase-js'
import type { Household, JoinRequest, Member } from '../types'
import { SEED_FOODS } from './seed'
import { newId } from '../lib/id'

// Short, shareable join codes. No ambiguous characters (0/O, 1/I/L) so codes
// are easy to read out loud or type on a phone.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function randomCode(len = 6): string {
  let out = ''
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return out
}

// Ensure the shared food catalog exists (seeded once per project, not per
// household — the pairing engine relies on stable food ids).
export async function ensureFoodCatalog(db: SupabaseClient): Promise<void> {
  const { count } = await db.from('foods').select('id', { count: 'exact', head: true })
  if ((count ?? 0) === 0) {
    await db.from('foods').upsert(SEED_FOODS)
  }
}

export interface NewMember {
  id: string
  name: string
  emoji: string
  color: string
}

export interface HouseholdJoinResult {
  household: Household
  memberId: string
}

// Create a fresh household with a unique code, seed the shared catalog if
// needed, and add the creator as its first member.
export async function createHousehold(
  db: SupabaseClient,
  opts: {
    name: string
    monthly_budget: number
    budget_mode: boolean
    currency?: string
    member: NewMember
    authId?: string | null
    adminEmail?: string | null
  },
): Promise<HouseholdJoinResult> {
  await ensureFoodCatalog(db)

  // Insert with a unique code, retrying on the (rare) collision.
  let household: Household | null = null
  for (let attempt = 0; attempt < 6 && !household; attempt++) {
    const id = randomCode()
    const row = {
      id,
      name: opts.name || 'Our Household',
      monthly_budget: opts.monthly_budget || 0,
      budget_mode: opts.budget_mode,
      currency: opts.currency ?? 'KES',
      owner_member_id: opts.member.id, // the creator is the admin
      admin_email: opts.adminEmail ?? null,
      created_at: new Date().toISOString(),
    }
    const { data, error } = await db.from('households').insert(row).select().single()
    if (!error && data) household = data as Household
    else if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message)
  }
  if (!household) throw new Error('Could not create a household — please try again.')

  await db.from('members').insert({
    id: opts.member.id,
    household_id: household.id,
    name: opts.member.name,
    emoji: opts.member.emoji,
    color: opts.member.color,
    auth_id: opts.authId ?? null,
    created_at: new Date().toISOString(),
  })

  return { household, memberId: opts.member.id }
}

// Look up a household by its code (case-insensitive). Returns the household
// plus its current members, or null if the code doesn't exist.
export async function lookupHousehold(
  db: SupabaseClient,
  code: string,
): Promise<{ household: Household; members: Member[] } | null> {
  const id = code.trim().toUpperCase()
  if (!id) return null
  const { data, error } = await db.from('households').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  const { data: members } = await db
    .from('members')
    .select('*')
    .eq('household_id', id)
    .order('created_at')
  return { household: data as Household, members: (members as Member[]) ?? [] }
}

// Request to join a household (admin-approved). Creates a pending request the
// admin can approve or deny. Returns the request + household name, or null if
// the code doesn't exist.
export async function requestToJoin(
  db: SupabaseClient,
  code: string,
  member: NewMember,
  authId?: string | null,
): Promise<{ request: JoinRequest; householdName: string } | null> {
  const found = await lookupHousehold(db, code)
  if (!found) return null
  const row = {
    id: newId('req'),
    household_id: found.household.id,
    name: member.name,
    emoji: member.emoji,
    color: member.color,
    status: 'pending' as const,
    member_id: null,
    requester_auth_id: authId ?? null,
    created_at: new Date().toISOString(),
  }
  const { data, error } = await db.from('join_requests').insert(row).select().single()
  if (error) throw new Error(error.message)
  return { request: data as JoinRequest, householdName: found.household.name }
}

// Poll a single request (the joiner watches this until approved/denied).
export async function getJoinRequest(
  db: SupabaseClient,
  requestId: string,
): Promise<JoinRequest | null> {
  const { data } = await db.from('join_requests').select('*').eq('id', requestId).maybeSingle()
  return (data as JoinRequest) ?? null
}

// Admin approves a request: create the member and stamp the request approved.
export async function approveJoinRequest(
  db: SupabaseClient,
  request: JoinRequest,
): Promise<string> {
  const memberId = request.member_id ?? newId('member')
  await db.from('members').insert({
    id: memberId,
    household_id: request.household_id,
    name: request.name,
    emoji: request.emoji,
    color: request.color,
    // Link the new member to the requester's auth identity so RLS grants them
    // access to this household.
    auth_id: request.requester_auth_id ?? null,
    created_at: new Date().toISOString(),
  })
  await db
    .from('join_requests')
    .update({ status: 'approved', member_id: memberId })
    .eq('id', request.id)
  return memberId
}

// Admin denies a request.
export async function denyJoinRequest(db: SupabaseClient, requestId: string): Promise<void> {
  await db.from('join_requests').update({ status: 'denied' }).eq('id', requestId)
}
