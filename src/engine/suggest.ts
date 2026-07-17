import type {
  AppData,
  Food,
  FoodPreference,
  ScoredCombo,
} from '../types'
import { daysSince } from '../lib/format'

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

  const byCat = (cat: Food['category']) =>
    data.foods
      .filter((f) => f.category === cat)
      .map((f) => scoreFood(f, pref, lastEaten, opts))

  const bases = byCat('base')
  const proteins = byCat('protein')
  const vegs = byCat('veg')

  const base = pickWeighted(bases, exclude)
  // (a) Classic pairing bonus applied relative to the chosen base.
  const pairMap = base ? CLASSIC_PAIRS[base.food.id] ?? {} : {}
  const boostedProteins = proteins.map((p) => ({
    ...p,
    score: p.score + (pairMap[p.food.id] ?? 0),
  }))
  const protein = pickWeighted(boostedProteins, exclude)
  const boostedVegs = vegs.map((v) => ({
    ...v,
    score: v.score + (pairMap[v.food.id] ?? 0),
  }))
  const veg = pickWeighted(boostedVegs, exclude)

  const reasons: string[] = []
  if (base && protein && pairMap[protein.food.id]) {
    reasons.push(`${base.food.name} + ${protein.food.name} is a classic combo ✨`)
  }
  for (const s of [base, protein, veg]) {
    if (s) reasons.push(...s.reasons)
  }
  if (opts.budgetMode) reasons.push('Budget mode: kept it easy on the wallet 💸')

  const totalCost =
    (base?.food.cost ?? 0) + (protein?.food.cost ?? 0) + (veg?.food.cost ?? 0)
  const score =
    (base?.score ?? 0) + (protein?.score ?? 0) + (veg?.score ?? 0)

  return {
    base: base?.food,
    protein: protein?.food,
    veg: veg?.food,
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
