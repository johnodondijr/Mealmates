import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppData,
  Expense,
  Food,
  JoinRequest,
  MealCost,
  MealEaten,
  Member,
  PlannedMeal,
  Preference,
  Settings,
  Vote,
  VoteOption,
} from '../types'
import { createRepository, usingSupabase, needsHousehold, type Repository } from '../data'
import {
  getStoredSupabaseConfig,
  setSupabaseConfig,
  getHouseholdId,
  setHouseholdId,
  supabase,
  ensureAuth,
} from '../data/supabaseClient'
import {
  approveJoinRequest as approveReq,
  denyJoinRequest as denyReq,
} from '../data/household'
import { HouseholdGate } from '../components/HouseholdGate'
import { newId } from '../lib/id'
import { todayISO } from '../lib/format'

interface AppContextValue {
  data: AppData
  loading: boolean
  usingSupabase: boolean

  // Household (Supabase mode): the join code and who's currently online.
  householdId: string | null
  onlineMemberIds: string[]
  presenceEnabled: boolean
  leaveHousehold: () => void

  // Admin-approved joins.
  isAdmin: boolean
  pendingRequests: JoinRequest[]
  approveJoinRequest: (req: JoinRequest) => Promise<void>
  denyJoinRequest: (id: string) => Promise<void>

  currentMemberId: string
  setCurrentMemberId: (id: string) => void
  currentMember: Member | undefined

  // members
  saveMember: (member: Member) => Promise<void>
  removeMember: (id: string) => Promise<void>

  // foods
  saveFood: (food: Food) => Promise<void>
  removeFood: (id: string) => Promise<void>
  setPreference: (
    foodId: string,
    pref: Preference | null,
    memberId?: string,
  ) => Promise<void>

  // "Don't suggest this combo to me again" (per current member). on=false undoes.
  setComboDislike: (signature: string, on: boolean) => Promise<void>

  // Weekly plan.
  setPlannedMeal: (meal: PlannedMeal) => Promise<void>
  removePlannedMeal: (id: string) => Promise<void>

  // wishes ("I want this today")
  setWish: (foodId: string, on: boolean, memberId?: string) => Promise<void>
  clearWishes: (wishedOn: string) => Promise<void>

  // votes
  createVote: (vote: Vote, options: VoteOption[]) => Promise<void>
  castBallot: (voteId: string, optionId: string, memberId?: string) => Promise<void>
  closeVote: (voteId: string, winnerOptionId: string | null) => Promise<void>

  // meals
  logMeal: (meal: MealEaten) => Promise<void>
  updateMeal: (meal: MealEaten) => Promise<void>
  removeMeal: (id: string) => Promise<void>

  // expenses
  addExpense: (expense: Expense) => Promise<void>
  removeExpense: (id: string) => Promise<void>

  // settings
  updateSettings: (settings: Settings) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

const CURRENT_MEMBER_KEY = 'mealmates.currentMember'

// Gate wrapper: when Supabase is configured but this device hasn't joined a
// household yet, show the create/join screen instead of the app. Kept in a
// thin outer component so the real provider's hooks always run in the same
// order (this one only ever calls useState).
export function AppProvider({ children }: { children: ReactNode }) {
  const [gate] = useState(() => needsHousehold())
  if (gate) return <HouseholdGate />
  return <AppProviderInner>{children}</AppProviderInner>
}

function AppProviderInner({ children }: { children: ReactNode }) {
  const repoRef = useRef<Repository>()
  if (!repoRef.current) repoRef.current = createRepository()
  const repo = repoRef.current

  const [data, setData] = useState<AppData | null>(null)
  const [currentMemberId, setCurrentMemberIdState] = useState<string>(
    () => localStorage.getItem(CURRENT_MEMBER_KEY) ?? 'member_1',
  )

  const reload = useCallback(async () => {
    try {
      // Ensure an auth session exists before reading, so row-level security can
      // scope the data once strict policies are enabled.
      await ensureAuth()
      const fresh = await repo.loadAll()
      setData(fresh)
    } catch (e) {
      console.error('MealMates: failed to load data', e)
      // Safety net: if a runtime Supabase connection is broken, drop it and
      // reload once so the app falls back to local storage instead of getting
      // stuck on the boot screen. Guarded so it can't loop.
      if (
        usingSupabase &&
        getStoredSupabaseConfig() &&
        !sessionStorage.getItem('mm.supabaseFallback')
      ) {
        sessionStorage.setItem('mm.supabaseFallback', '1')
        setSupabaseConfig(null)
        window.location.reload()
      }
    }
  }, [repo])

  useEffect(() => {
    reload()
    const unsub = repo.subscribe(reload)
    return unsub
  }, [repo, reload])

  const setCurrentMemberId = useCallback((id: string) => {
    setCurrentMemberIdState(id)
    localStorage.setItem(CURRENT_MEMBER_KEY, id)
  }, [])

  // If the active member no longer exists (e.g. after a reset), fall back to
  // the first member so the profile switcher / greeting stay valid.
  useEffect(() => {
    if (!data) return
    if (data.members.length > 0 && !data.members.some((m) => m.id === currentMemberId)) {
      setCurrentMemberId(data.members[0].id)
    }
  }, [data, currentMemberId, setCurrentMemberId])

  // Live presence: broadcast that this member is online and track who else is,
  // via a Supabase Realtime presence channel keyed by household.
  const householdId = getHouseholdId()
  const presenceEnabled = usingSupabase && !!householdId
  const [onlineMemberIds, setOnlineMemberIds] = useState<string[]>([])
  useEffect(() => {
    if (!presenceEnabled || !supabase || !householdId || !currentMemberId) {
      setOnlineMemberIds([])
      return
    }
    const channel = supabase.channel(`presence-${householdId}`, {
      config: { presence: { key: currentMemberId } },
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineMemberIds(Object.keys(channel.presenceState()))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ member_id: currentMemberId, at: Date.now() })
        }
      })
    return () => {
      supabase!.removeChannel(channel)
    }
  }, [presenceEnabled, householdId, currentMemberId])

  const leaveHousehold = useCallback(() => {
    setHouseholdId(null)
    localStorage.removeItem(CURRENT_MEMBER_KEY)
    window.location.reload()
  }, [])

  // Pending join requests for this household, kept live so the admin sees them
  // arrive in real time.
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([])
  useEffect(() => {
    if (!presenceEnabled || !supabase || !householdId) {
      setPendingRequests([])
      return
    }
    let active = true
    const load = async () => {
      const { data: rows } = await supabase!
        .from('join_requests')
        .select('*')
        .eq('household_id', householdId)
        .eq('status', 'pending')
        .order('created_at')
      if (active) setPendingRequests((rows as JoinRequest[]) ?? [])
    }
    load()
    const channel = supabase
      .channel(`requests-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'join_requests',
          filter: `household_id=eq.${householdId}`,
        },
        () => load(),
      )
      .subscribe()
    return () => {
      active = false
      supabase!.removeChannel(channel)
    }
  }, [presenceEnabled, householdId])

  const approveJoinRequest = useCallback(async (req: JoinRequest) => {
    if (!supabase) return
    await approveReq(supabase, req)
    setPendingRequests((prev) => prev.filter((r) => r.id !== req.id))
    await reload()
  }, [reload])

  const denyJoinRequest = useCallback(async (id: string) => {
    if (!supabase) return
    await denyReq(supabase, id)
    setPendingRequests((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // Every mutation optimistically reloads afterward so local state stays in
  // sync even on the same tab (BroadcastChannel doesn't fire on the sender).
  const withReload = useCallback(
    <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
      async (...args: A) => {
        await fn(...args)
        await reload()
      },
    [reload],
  )

  const value = useMemo<AppContextValue | null>(() => {
    if (!data) return null
    const currentMember = data.members.find((m) => m.id === currentMemberId)
    // The admin is the household owner. For households created before owners
    // were tracked, fall back to the earliest-joined member.
    const earliestMemberId = data.members
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))[0]?.id
    const ownerId = data.settings.owner_member_id ?? earliestMemberId
    const isAdmin = presenceEnabled && !!ownerId && ownerId === currentMemberId

    return {
      data,
      loading: false,
      usingSupabase,
      householdId,
      onlineMemberIds,
      presenceEnabled,
      leaveHousehold,
      isAdmin,
      pendingRequests,
      approveJoinRequest,
      denyJoinRequest,
      currentMemberId,
      setCurrentMemberId,
      currentMember,

      saveMember: withReload((m: Member) => repo.upsertMember(m)),
      removeMember: withReload((id: string) => repo.removeMember(id)),

      saveFood: withReload((f: Food) => repo.upsertFood(f)),
      removeFood: withReload((id: string) => repo.removeFood(id)),
      setPreference: withReload(
        (foodId: string, pref: Preference | null, memberId?: string) =>
          repo.setPreference(memberId ?? currentMemberId, foodId, pref),
      ),
      setComboDislike: withReload((signature: string, on: boolean) =>
        repo.setComboDislike(currentMemberId, signature, on),
      ),
      setPlannedMeal: withReload((m: PlannedMeal) => repo.setPlannedMeal(m)),
      removePlannedMeal: withReload((id: string) => repo.removePlannedMeal(id)),
      setWish: withReload((foodId: string, on: boolean, memberId?: string) =>
        repo.setWish(memberId ?? currentMemberId, foodId, todayISO(), on),
      ),
      clearWishes: withReload((wishedOn: string) => repo.clearWishes(wishedOn)),

      createVote: withReload((v: Vote, o: VoteOption[]) => repo.createVote(v, o)),
      castBallot: withReload(
        (voteId: string, optionId: string, memberId?: string) =>
          repo.castBallot({
            id: newId('ballot'),
            vote_id: voteId,
            option_id: optionId,
            member_id: memberId ?? currentMemberId,
            created_at: new Date().toISOString(),
          }),
      ),
      closeVote: withReload((voteId: string, winner: string | null) =>
        repo.closeVote(voteId, winner),
      ),

      logMeal: withReload((meal: MealEaten) => repo.logMeal(meal)),
      updateMeal: withReload((meal: MealEaten) => repo.updateMeal(meal)),
      removeMeal: withReload((id: string) => repo.removeMeal(id)),

      addExpense: withReload((e: Expense) => repo.addExpense(e)),
      removeExpense: withReload((id: string) => repo.removeExpense(id)),

      updateSettings: withReload((s: Settings) => repo.updateSettings(s)),
    }
  }, [
    data,
    currentMemberId,
    repo,
    setCurrentMemberId,
    withReload,
    householdId,
    onlineMemberIds,
    presenceEnabled,
    leaveHousehold,
    pendingRequests,
    approveJoinRequest,
    denyJoinRequest,
  ])

  if (!value) {
    return <BootScreen />
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

// Convenience: quickly log an eaten meal from a combo shape.
export function mealFromCombo(
  label: string,
  slot: MealEaten['slot'],
  parts: { base_id?: string | null; protein_id?: string | null; veg_id?: string | null },
  cost: number,
  loggedBy: string,
  fromVoteId: string | null = null,
  componentCosts: MealCost[] = [],
): MealEaten {
  const total = componentCosts.length
    ? componentCosts.reduce((s, c) => s + c.amount, 0)
    : cost
  return {
    id: newId('meal'),
    slot,
    label,
    base_id: parts.base_id ?? null,
    protein_id: parts.protein_id ?? null,
    veg_id: parts.veg_id ?? null,
    cost: total,
    component_costs: componentCosts,
    eaten_on: todayISO(),
    logged_by: loggedBy,
    from_vote_id: fromVoteId,
    created_at: new Date().toISOString(),
  }
}

function BootScreen() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-cream dark:bg-charcoal-950">
      <div className="animate-bounce text-6xl">🍲</div>
    </div>
  )
}
