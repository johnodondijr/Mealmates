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
  MealEaten,
  Member,
  Preference,
  Settings,
  Vote,
  VoteOption,
} from '../types'
import { createRepository, usingSupabase, type Repository } from '../data'
import { newId } from '../lib/id'
import { todayISO } from '../lib/format'

interface AppContextValue {
  data: AppData
  loading: boolean
  usingSupabase: boolean

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

  // votes
  createVote: (vote: Vote, options: VoteOption[]) => Promise<void>
  castBallot: (voteId: string, optionId: string, memberId?: string) => Promise<void>
  closeVote: (voteId: string, winnerOptionId: string | null) => Promise<void>

  // meals
  logMeal: (meal: MealEaten) => Promise<void>
  removeMeal: (id: string) => Promise<void>

  // expenses
  addExpense: (expense: Expense) => Promise<void>
  removeExpense: (id: string) => Promise<void>

  // settings
  updateSettings: (settings: Settings) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

const CURRENT_MEMBER_KEY = 'mealmates.currentMember'

export function AppProvider({ children }: { children: ReactNode }) {
  const repoRef = useRef<Repository>()
  if (!repoRef.current) repoRef.current = createRepository()
  const repo = repoRef.current

  const [data, setData] = useState<AppData | null>(null)
  const [currentMemberId, setCurrentMemberIdState] = useState<string>(
    () => localStorage.getItem(CURRENT_MEMBER_KEY) ?? 'member_1',
  )

  const reload = useCallback(async () => {
    const fresh = await repo.loadAll()
    setData(fresh)
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

    return {
      data,
      loading: false,
      usingSupabase,
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
      removeMeal: withReload((id: string) => repo.removeMeal(id)),

      addExpense: withReload((e: Expense) => repo.addExpense(e)),
      removeExpense: withReload((id: string) => repo.removeExpense(id)),

      updateSettings: withReload((s: Settings) => repo.updateSettings(s)),
    }
  }, [data, currentMemberId, repo, setCurrentMemberId, withReload])

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
): MealEaten {
  return {
    id: newId('meal'),
    slot,
    label,
    base_id: parts.base_id ?? null,
    protein_id: parts.protein_id ?? null,
    veg_id: parts.veg_id ?? null,
    cost,
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
