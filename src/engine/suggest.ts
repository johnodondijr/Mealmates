import type {
  AppData,
  Food,
  FoodCategory,
  FoodPreference,
  MealSlot,
  ScoredCombo,
} from '../types'
import { daysSince } from '../lib/format'

// Which food categories make up a meal for each slot. Breakfast is a
// drink + a breakfast food; lunch/dinner are the classic base + protein + veg.
export const SLOT_CATEGORIES: Record<MealSlot, FoodCategory[]> = {
  breakfast: ['drink', 'breakfast'],
  lunch: ['base', 'protein', 'veg'],
  dinner: ['base', 'protein', 'veg'],
}

// Labels for the reels / combo slots, per meal slot.
export const SLOT_REEL_LABELS: Record<MealSlot, string[]> = {
  breakfast: ['Drink', 'Breakfast'],
  lunch: ['Base', 'Protein', 'Veg'],
  dinner: ['Base', 'Protein', 'Veg'],
}

// ---- Kenyan classic pairing logic ----
// Keyed by base food id -> protein/veg ids that pair especially well.
// Higher = better classic pairing.
const CLASSIC_PAIRS: Record<string, Record<string, number>> = {
  food_ugali: {
    food_sukuma_wiki: 3,
    food_beef_stew: 3,
    food_managu: 2.5,
    food_terere: 2.5,
    food_fried_tilapia: 2.5,
    food_nyama_choma: 3,
    food_omena: 2,
    food_cabbage: 1.5,
    food_spinach: 1.5,
  },
  food_chapati: {
    food_ndengu: 3,
    food_beans: 2.5,
    food_beef_stew: 2.5,
    food_chicken_wet_fry_: 2.5,
    food_minced_meat: 2,
  },
  food_rice: {
    food_beans: 3,
    food_chicken_wet_fry_: 3,
    food_chicken_dry_fry_: 2.5,
    food_beef_stew: 2.5,
    food_ndengu: 2.5,
    food_kachumbari: 2,
  },
  food_spaghetti: {
    food_minced_meat: 3,
    food_beef_stew: 2.5,
    food_sausages: 2,
    food_eggs: 1.5,
  },
  food_githeri: {
    food_avocado: 2.5,
    food_kachumbari: 2,
    food_beef_stew: 2,
  },
  food_matoke: {
    food_beef_stew: 2.5,
    food_chicken_wet_fry_: 2.5,
  },
  food_mukimo: {
    food_beef_stew: 3,
    food_nyama_choma: 2.5,
    food_kachumbari: 2,
  },
  food_mashed_potatoes: {
    food_beef_stew: 2.5,
    food_sausages: 2,
    food_chicken_wet_fry_: 2,
  },
  food_fries___chips: {
    food_chicken_dry_fry_: 2.5,
    food_sausages: 2,
    food_eggs: 2,
    food_kachumbari: 1.5,
  },
}

export interface SuggestOptions {
  budgetMode: boolean
  presentMemberIds: string[]
  slot?: MealSlot // defaults to dinner (base/protein/veg)
  // exclude specific food ids (e.g. when re-rolling a single slot)
  excludeIds?: string[]
}

interface PrefIndex {
  loves: Map<string, Set<string>> // foodId -> memberIds who love it
  refuses: Map<string, Set<string>> // foodId -> memberIds who refuse it
}

function indexPreferences(prefs: FoodPreference[]): PrefIndex {
  const loves = new Map<string, Set<string>>()
  const refuses = new Map<string, Set<string>>()
  for (const p of prefs) {
    const map = p.preference === 'love' ? loves : refuses
    if (!map.has(p.food_id)) map.set(p.food_id, new Set())
    map.get(p.food_id)!.add(p.member_id)
  }
  return { loves, refuses }
}

// Most recent day a food was eaten, or null if never.
function lastEatenIndex(data: AppData): Map<string, string> {
  const idx = new Map<string, string>()
  for (const m of data.meals) {
    for (const id of [m.base_id, m.protein_id, m.veg_id]) {
      if (!id) continue
      const existing = idx.get(id)
      if (!existing || m.eaten_on > existing) idx.set(id, m.eaten_on)
    }
  }
  return idx
}

interface FoodScore {
  food: Food
  score: number
  reasons: string[]
  refusedBy: number
}

function scoreFood(
  food: Food,
  pref: PrefIndex,
  lastEaten: Map<string, string>,
  opts: SuggestOptions,
): FoodScore {
  let score = 5
  const reasons: string[] = []

  // (b) Recency — heavily penalize recently eaten foods.
  const last = lastEaten.get(food.id)
  if (last) {
    const d = daysSince(last)
    if (d <= 1) score -= 6
    else if (d <= 3) score -= 3.5
    else if (d <= 6) score -= 1
    else if (d >= 9) {
      score += 1.5
      reasons.push(`Haven't had ${food.name} in ${d} days 👀`)
    }
  } else {
    score += 1
  }

  // (c) Household preference — boost hearts.
  const loves = pref.loves.get(food.id)?.size ?? 0
  if (loves > 0) {
    score += loves * 1.2
    if (loves >= 2) reasons.push(`${loves} of you ❤️ ${food.name}`)
  }

  // Refusals among present members.
  const refusers = pref.refuses.get(food.id)
  const refusedBy = opts.presentMemberIds.filter((m) => refusers?.has(m)).length

  // (d) Budget mode — prefer cheaper foods.
  if (opts.budgetMode) {
    score += Math.max(0, (300 - food.cost) / 100)
  }

  // Gentle nudge toward easier meals.
  if (food.effort === 'Easy') score += 0.4

  return { food, score, reasons, refusedBy }
}

function pickWeighted(scores: FoodScore[], exclude: Set<string>): FoodScore | null {
  const pool = scores.filter((s) => !exclude.has(s.food.id) && s.refusedBy === 0)
  if (pool.length === 0) return null
  // Softmax-ish weighting so higher scores win more often but it's not fully
  // deterministic — keeps suggestions feeling fresh.
  const min = Math.min(...pool.map((s) => s.score))
  const weights = pool.map((s) => Math.pow(2, s.score - min))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

export function buildCombo(
  data: AppData,
  opts: SuggestOptions,
): ScoredCombo {
  const pref = indexPreferences(data.preferences)
  const lastEaten = lastEatenIndex(data)
  const exclude = new Set(opts.excludeIds ?? [])
  const slot = opts.slot ?? 'dinner'
  const cats = SLOT_CATEGORIES[slot]

  const byCat = (cat: Food['category']) =>
    data.foods
      .filter((f) => f.category === cat && f.suggestable !== false)
      .map((f) => scoreFood(f, pref, lastEaten, opts))

  // Slot 1 (base for lunch/dinner, drink for breakfast).
  const first = pickWeighted(byCat(cats[0]), exclude)

  // Classic pairings only apply to the base+protein+veg meals.
  const pairMap =
    slot !== 'breakfast' && first ? CLASSIC_PAIRS[first.food.id] ?? {} : {}

  const boost = (scores: FoodScore[]) =>
    scores.map((s) => ({ ...s, score: s.score + (pairMap[s.food.id] ?? 0) }))

  const second = cats[1]
    ? pickWeighted(boost(byCat(cats[1])), exclude)
    : null
  const third = cats[2] ? pickWeighted(boost(byCat(cats[2])), exclude) : null

  const reasons: string[] = []
  if (first && second && pairMap[second.food.id]) {
    reasons.push(`${first.food.name} + ${second.food.name} is a classic combo ✨`)
  }
  for (const s of [first, second, third]) {
    if (s) reasons.push(...s.reasons)
  }
  if (opts.budgetMode) reasons.push('Budget mode: kept it easy on the wallet 💸')

  const totalCost =
    (first?.food.cost ?? 0) + (second?.food.cost ?? 0) + (third?.food.cost ?? 0)
  const score =
    (first?.score ?? 0) + (second?.score ?? 0) + (third?.score ?? 0)

  // Map the picks onto the base/protein/veg shape (drink→base, breakfast→protein).
  return {
    base: first?.food,
    protein: second?.food,
    veg: third?.food,
    score,
    totalCost,
    reasons: [...new Set(reasons)].slice(0, 3),
  }
}

// Build N distinct combos for a vote's candidate options.
export function buildCandidates(
  data: AppData,
  opts: SuggestOptions,
  count: number,
): ScoredCombo[] {
  const out: ScoredCombo[] = []
  const seen = new Set<string>()
  let attempts = 0
  while (out.length < count && attempts < count * 8) {
    attempts++
    const c = buildCombo(data, opts)
    const key = `${c.base?.id}|${c.protein?.id}|${c.veg?.id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}

export function comboLabel(c: {
  base?: Food
  protein?: Food
  veg?: Food
}): string {
  return [c.base?.name, c.protein?.name, c.veg?.name].filter(Boolean).join(' + ')
}

// Build vote candidates from what people said they *want* today.
// Each distinct wished base is paired with the most-wished protein + veg,
// so everyone's cravings show up as options. Falls back to the engine if
// there aren't enough wishes to form 2+ combos.
export function buildWishCandidates(
  data: AppData,
  wishedOn: string,
  opts: SuggestOptions,
  count = 4,
): ScoredCombo[] {
  const todays = data.wishes.filter((w) => w.wished_on === wishedOn)
  const foodById = new Map(data.foods.map((f) => [f.id, f]))

  // How many people want each food.
  const demand = new Map<string, number>()
  for (const w of todays) demand.set(w.food_id, (demand.get(w.food_id) ?? 0) + 1)

  const cats = SLOT_CATEGORIES[opts.slot ?? 'dinner']
  const wished = (cat: Food['category']) =>
    [...demand.entries()]
      .map(([id, n]) => ({ food: foodById.get(id), n }))
      .filter((x): x is { food: Food; n: number } => !!x.food && x.food.category === cat)
      .sort((a, b) => b.n - a.n)

  const bases = wished(cats[0])
  const proteins = cats[1] ? wished(cats[1]) : []
  const vegs = cats[2] ? wished(cats[2]) : []

  const out: ScoredCombo[] = []
  const seen = new Set<string>()
  const topProtein = proteins[0]?.food
  const topVeg = vegs[0]?.food

  // One option per wished base, completed with the crowd's top protein/veg.
  for (const b of bases) {
    const protein = topProtein
    const veg = topVeg
    const key = `${b.food.id}|${protein?.id}|${veg?.id}`
    if (seen.has(key)) continue
    seen.add(key)
    const totalCost =
      b.food.cost + (protein?.cost ?? 0) + (veg?.cost ?? 0)
    out.push({
      base: b.food,
      protein,
      veg,
      score: b.n,
      totalCost,
      reasons: [`${b.n} wanted ${b.food.name} today 🙌`],
    })
    if (out.length >= count) break
  }

  // If proteins were wished but no bases, offer protein-led options too.
  if (out.length < count && bases.length === 0) {
    for (const p of proteins) {
      const key = `|${p.food.id}|${topVeg?.id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        base: undefined,
        protein: p.food,
        veg: topVeg,
        score: p.n,
        totalCost: p.food.cost + (topVeg?.cost ?? 0),
        reasons: [`${p.n} wanted ${p.food.name} today 🙌`],
      })
      if (out.length >= count) break
    }
  }

  // Top up with engine suggestions if we still don't have 2 options.
  if (out.length < 2) {
    const filler = buildCandidates(data, opts, count - out.length)
    for (const f of filler) {
      const key = `${f.base?.id}|${f.protein?.id}|${f.veg?.id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(f)
      if (out.length >= count) break
    }
  }

  return out.slice(0, count)
}
