import type { Repository } from './repository'
import type {
  AppData,
  Expense,
  Food,
  MealEaten,
  Member,
  Preference,
  Settings,
  Vote,
  VoteBallot,
  VoteOption,
} from '../types'
import { buildSeedData } from './seed'
import { newId } from '../lib/id'

const STORAGE_KEY = 'mealmates.data.v1'
const CHANNEL = 'mealmates.sync'

// Backfill fields added in later versions so older saved data keeps working
// (and no eating history is lost).
function migrate(data: AppData): AppData {
  data.wishes ??= []
  data.preferences ??= []
  data.votes ??= []
  data.voteOptions ??= []
  data.ballots ??= []
  data.meals ??= []
  data.expenses ??= []
  for (const f of data.foods ?? []) {
    if (f.suggestable === undefined) f.suggestable = true
    if (!Array.isArray(f.ingredients)) f.ingredients = []
  }
  for (const m of data.meals) {
    if (!Array.isArray(m.component_costs)) {
      m.component_costs = []
    }
  }
  // v3: breakfast needs its own drink + breakfast foods. If an older save has
  // no drink-category foods yet, add the new seed drinks/breakfast items
  // (without touching or duplicating existing foods).
  const hasDrink = (data.foods ?? []).some((f) => f.category === 'drink')
  if (!hasDrink) {
    const existing = new Set(data.foods.map((f) => f.id))
    for (const f of buildSeedData().foods) {
      if ((f.category === 'drink' || f.category === 'breakfast') && !existing.has(f.id)) {
        data.foods.push(f)
      }
    }
  }
  return data
}

// localStorage-backed adapter. Cross-tab realtime is handled with
// BroadcastChannel (fast, same-origin) plus a `storage` event fallback.
export class LocalRepository implements Repository {
  private channel: BroadcastChannel | null = null

  private read(): AppData {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seed = buildSeedData()
      this.write(seed, false)
      return seed
    }
    try {
      return migrate(JSON.parse(raw) as AppData)
    } catch {
      const seed = buildSeedData()
      this.write(seed, false)
      return seed
    }
  }

  private write(data: AppData, broadcast = true): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    if (broadcast) this.ping()
  }

  private mutate(fn: (draft: AppData) => void): void {
    const data = this.read()
    fn(data)
    this.write(data)
  }

  private ping(): void {
    try {
      this.channel?.postMessage('changed')
    } catch {
      /* channel may be closed */
    }
  }

  async loadAll(): Promise<AppData> {
    return this.read()
  }

  subscribe(onChange: () => void): () => void {
    this.channel = new BroadcastChannel(CHANNEL)
    const onMessage = () => onChange()
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) onChange()
    }
    this.channel.addEventListener('message', onMessage)
    window.addEventListener('storage', onStorage)
    return () => {
      this.channel?.removeEventListener('message', onMessage)
      this.channel?.close()
      this.channel = null
      window.removeEventListener('storage', onStorage)
    }
  }

  async upsertMember(member: Member): Promise<void> {
    this.mutate((d) => {
      const i = d.members.findIndex((m) => m.id === member.id)
      if (i >= 0) d.members[i] = member
      else d.members.push(member)
    })
  }

  async removeMember(id: string): Promise<void> {
    this.mutate((d) => {
      d.members = d.members.filter((m) => m.id !== id)
      d.preferences = d.preferences.filter((p) => p.member_id !== id)
    })
  }

  async upsertFood(food: Food): Promise<void> {
    this.mutate((d) => {
      const i = d.foods.findIndex((f) => f.id === food.id)
      if (i >= 0) d.foods[i] = food
      else d.foods.push(food)
    })
  }

  async removeFood(id: string): Promise<void> {
    this.mutate((d) => {
      d.foods = d.foods.filter((f) => f.id !== id)
      d.preferences = d.preferences.filter((p) => p.food_id !== id)
    })
  }

  async setPreference(
    memberId: string,
    foodId: string,
    pref: Preference | null,
  ): Promise<void> {
    this.mutate((d) => {
      d.preferences = d.preferences.filter(
        (p) => !(p.member_id === memberId && p.food_id === foodId),
      )
      if (pref) {
        d.preferences.push({
          id: newId('pref'),
          member_id: memberId,
          food_id: foodId,
          preference: pref,
        })
      }
    })
  }

  async setWish(
    memberId: string,
    foodId: string,
    wishedOn: string,
    on: boolean,
  ): Promise<void> {
    this.mutate((d) => {
      d.wishes = d.wishes.filter(
        (w) =>
          !(
            w.member_id === memberId &&
            w.food_id === foodId &&
            w.wished_on === wishedOn
          ),
      )
      if (on) {
        d.wishes.push({
          id: newId('wish'),
          member_id: memberId,
          food_id: foodId,
          wished_on: wishedOn,
        })
      }
    })
  }

  async clearWishes(wishedOn: string): Promise<void> {
    this.mutate((d) => {
      d.wishes = d.wishes.filter((w) => w.wished_on !== wishedOn)
    })
  }

  async createVote(vote: Vote, options: VoteOption[]): Promise<void> {
    this.mutate((d) => {
      d.votes.push(vote)
      d.voteOptions.push(...options)
    })
  }

  async castBallot(ballot: VoteBallot): Promise<void> {
    this.mutate((d) => {
      // One ballot per member per vote — replace any existing one.
      d.ballots = d.ballots.filter(
        (b) => !(b.vote_id === ballot.vote_id && b.member_id === ballot.member_id),
      )
      d.ballots.push(ballot)
    })
  }

  async closeVote(voteId: string, winnerOptionId: string | null): Promise<void> {
    this.mutate((d) => {
      const v = d.votes.find((x) => x.id === voteId)
      if (v) {
        v.status = 'closed'
        v.winner_option_id = winnerOptionId
      }
    })
  }

  async logMeal(meal: MealEaten): Promise<void> {
    this.mutate((d) => {
      d.meals.push(meal)
    })
  }

  async updateMeal(meal: MealEaten): Promise<void> {
    this.mutate((d) => {
      const i = d.meals.findIndex((m) => m.id === meal.id)
      if (i >= 0) d.meals[i] = meal
    })
  }

  async removeMeal(id: string): Promise<void> {
    this.mutate((d) => {
      d.meals = d.meals.filter((m) => m.id !== id)
    })
  }

  async addExpense(expense: Expense): Promise<void> {
    this.mutate((d) => {
      d.expenses.push(expense)
    })
  }

  async removeExpense(id: string): Promise<void> {
    this.mutate((d) => {
      d.expenses = d.expenses.filter((e) => e.id !== id)
    })
  }

  async updateSettings(settings: Settings): Promise<void> {
    this.mutate((d) => {
      d.settings = settings
    })
  }
}
