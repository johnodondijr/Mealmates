import type { Repository } from './repository'
import type {
  AppData,
  Expense,
  Food,
  FoodCategory,
  MealEaten,
  Member,
  Preference,
  Settings,
  Vote,
  VoteBallot,
  VoteOption,
} from '../types'
import { buildSeedData, TEXTURE_MAP } from './seed'
import { newId } from '../lib/id'

// v2: clean default (single housemate, no seeded history/spending).
const STORAGE_KEY = 'mealmates.data.v2'
const SCHEMA_KEY = 'mealmates.schema'
const CHANNEL = 'mealmates.sync'
const CURRENT_SCHEMA = 9

// Old loud member colours → curated muted equivalents.
const MEMBER_RECOLOR: Record<string, string> = {
  '#F45A28': '#C4704F',
  '#F59300': '#C79A3E',
  '#6B942A': '#6B8E5A',
  '#C2478E': '#9A6E8A',
}

// Matches any drink/liquid so we never let one sit in the solid breakfast reel.
const LIQUID_HINT = /\b(tea|coffee|uji|porridge|milk|milo|cocoa|juice|smoothie|chocolate)\b/i
// Legacy combined seed items that mixed a drink with a solid.
const LEGACY_COMBINED = new Set(['food_tea___bread', 'food_eggs___toast'])

// Field-level backfill — safe to run on every read.
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
    if (f.available === undefined) f.available = true
    if (!Array.isArray(f.ingredients)) f.ingredients = []
    if (!f.texture) f.texture = TEXTURE_MAP[f.id] ?? 'neutral'
  }
  for (const m of data.meals) {
    if (!Array.isArray(m.component_costs)) m.component_costs = []
  }
  return data
}

// One-time data fixups, guarded by a stored schema version so we don't, e.g.,
// re-add foods the household deliberately deleted.
function applyFixups(data: AppData): boolean {
  const applied = Number(localStorage.getItem(SCHEMA_KEY) || '1')
  if (applied >= CURRENT_SCHEMA) return false

  // Any liquid that ended up in the breakfast (solid) category becomes a drink,
  // so breakfast is always a drink + a solid — never liquid + liquid.
  for (const f of data.foods) {
    if (f.category === 'breakfast' && LIQUID_HINT.test(f.name)) {
      f.category = 'drink'
    }
  }
  // Drop legacy combined seed items.
  data.foods = data.foods.filter((f) => !LEGACY_COMBINED.has(f.id))

  // Refresh the old loud default member colours to the muted palette.
  for (const m of data.members) {
    if (MEMBER_RECOLOR[m.color]) m.color = MEMBER_RECOLOR[m.color]
  }

  // Sausages are a snack/breakfast item — move out of main-meal proteins.
  const sausages = data.foods.find((f) => f.id === 'food_sausages')
  if (sausages && sausages.category === 'protein') sausages.category = 'breakfast'

  // Recategorise: fruits are their own group; pilau/biryani are main meals.
  const recat: Record<string, FoodCategory> = {
    food_avocado: 'fruit',
    food_pilau: 'base',
    food_biryani: 'base',
    // Weetabix is a wet, milk-based breakfast — sits with the drinks so it's
    // never spun alongside tea/coffee.
    food_weetabix: 'drink',
    // Boiled maize is a snack/breakfast, not a dinner base.
    food_boiled_maize: 'breakfast',
  }
  for (const f of data.foods) {
    if (recat[f.id]) f.category = recat[f.id]
  }
  // Retire the combined "Ugali + Matumbo" treat (Matumbo is now its own food).
  data.foods = data.foods.filter((f) => f.id !== 'food_ugali_matumbo')

  // Add any new seed foods (across all categories) that aren't present yet.
  const existing = new Set(data.foods.map((f) => f.id))
  for (const f of buildSeedData().foods) {
    if (!existing.has(f.id)) data.foods.push(f)
  }

  localStorage.setItem(SCHEMA_KEY, String(CURRENT_SCHEMA))
  return true
}

// localStorage-backed adapter. Cross-tab realtime is handled with
// BroadcastChannel (fast, same-origin) plus a `storage` event fallback.
export class LocalRepository implements Repository {
  private channel: BroadcastChannel | null = null

  private read(): AppData {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seed = buildSeedData()
      localStorage.setItem(SCHEMA_KEY, String(CURRENT_SCHEMA))
      this.write(seed, false)
      return seed
    }
    try {
      const data = migrate(JSON.parse(raw) as AppData)
      if (applyFixups(data)) this.write(data, false)
      return data
    } catch {
      const seed = buildSeedData()
      localStorage.setItem(SCHEMA_KEY, String(CURRENT_SCHEMA))
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
