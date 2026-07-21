import type {
  AppData,
  Food,
  FoodCategory,
  FoodPreference,
  MealSlot,
  ScoredCombo,
} from '../types'
import { FOOD_TAGS } from '../data/seed'
import { dietBlockedFoodIds } from '../lib/diet'
import { daysSince, todayISO } from '../lib/format'

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
  // Mukimo is a soft mash — it wants a light, saucy stew, not dry/fishy sides.
  food_mukimo: {
    food_beef_stew: 3,
    food_minced_meat: 2.5,
    food_chicken_wet_fry_: 2.5,
    food_kachumbari: 1.5,
  },
  food_mashed_potatoes: {
    food_beef_stew: 2.5,
    food_sausages: 2,
    food_chicken_wet_fry_: 2,
  },
  // Rich rice dishes go with meat/goat/chicken stews.
  food_biryani: {
    food_beef_stew: 3,
    food_goat_stew: 3,
    food_chicken_wet_fry_: 3,
    food_chicken_dry_fry_: 2.5,
    food_boiled_meat: 2.5,
    food_kienyeji_chicken: 2.5,
    food_nyama_choma: 2,
    food_kachumbari: 2,
  },
  food_pilau: {
    food_goat_stew: 3,
    food_beef_stew: 2.5,
    food_chicken_wet_fry_: 2.5,
    food_boiled_meat: 2.5,
    food_kachumbari: 3, // pilau + kachumbari is the classic
  },
  food_fries___chips: {
    food_chicken_dry_fry_: 2.5,
    food_sausages: 2,
    food_eggs: 2,
    food_kachumbari: 1.5,
  },
}

// ---- Clash logic ----
// Tags let us reason about bad pairings generically instead of listing every
// pair. See FOOD_TAGS in seed.ts.
function tagsOf(f?: Food): string[] {
  return (f && FOOD_TAGS[f.id]) || []
}

// Penalty for two foods that shouldn't share a plate. 0 = fine.
function pairClash(a?: Food, b?: Food): number {
  if (!a || !b) return 0
  const ta = tagsOf(a)
  const tb = tagsOf(b)
  const both = (x: string, y: string) =>
    (ta.includes(x) && tb.includes(y)) || (tb.includes(x) && ta.includes(y))
  let p = 0
  // Two legumes on one plate (e.g. beans + green beans, githeri + kamande).
  if (ta.includes('legume') && tb.includes('legume')) p += 8
  // A soft mash with a dry/fishy protein (e.g. mukimo + omena/fish).
  if (both('mash', 'fishy')) p += 8
  // A maize base with a legume — that's just githeri, don't double it up.
  if (both('maize', 'legume')) p += 5
  return p
}

// Total clash penalty across a base/protein/veg combo.
function comboClash(c: { base?: Food; protein?: Food; veg?: Food }): number {
  return pairClash(c.base, c.protein) + pairClash(c.base, c.veg) + pairClash(c.protein, c.veg)
}

export interface SuggestOptions {
  budgetMode: boolean
  presentMemberIds: string[]
  slot?: MealSlot // defaults to dinner (base/protein/veg)
  // exclude specific food ids (e.g. when re-rolling a single slot)
  excludeIds?: string[]
  // Whole-combo signatures to avoid repeating (recent spins on this screen).
  avoidSignatures?: string[]
  // Combos a present member has permanently disliked — never suggest these.
  dislikedSignatures?: string[]
  // Foods shown in the last few spins — softly down-weighted so the same
  // items don't keep reappearing (keeps the reels feeling varied).
  deprioritizeIds?: string[]
  // The combo currently on screen. A fresh spin must change at least two of
  // its slots so consecutive spins never look nearly identical.
  previous?: { base?: string | null; protein?: string | null; veg?: string | null }
}

// How many of a combo's slots differ from a previous combo.
function comboChanges(
  c: { base?: Food; protein?: Food; veg?: Food },
  prev: { base?: string | null; protein?: string | null; veg?: string | null },
): number {
  let n = 0
  if ((c.base?.id ?? null) !== (prev.base ?? null)) n++
  if ((c.protein?.id ?? null) !== (prev.protein ?? null)) n++
  if ((c.veg?.id ?? null) !== (prev.veg ?? null)) n++
  return n
}

// A stable signature for a combo so we can detect repeats.
export function comboSignature(c: {
  base?: { id: string } | null
  protein?: { id: string } | null
  veg?: { id: string } | null
}): string {
  return `${c.base?.id ?? ''}|${c.protein?.id ?? ''}|${c.veg?.id ?? ''}`
}

function mealSignature(m: {
  base_id: string | null
  protein_id: string | null
  veg_id: string | null
}): string {
  return `${m.base_id ?? ''}|${m.protein_id ?? ''}|${m.veg_id ?? ''}`
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

// How many times each food has been part of a logged meal — the household's
// revealed-preference signal for what it actually enjoys.
function eatenCountIndex(data: AppData): Map<string, number> {
  const idx = new Map<string, number>()
  for (const m of data.meals) {
    for (const id of [m.base_id, m.protein_id, m.veg_id]) {
      if (!id) continue
      idx.set(id, (idx.get(id) ?? 0) + 1)
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
  popularity: Map<string, number>,
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

  // (c2) Popularity — lean toward what the household actually eats. Capped so
  // it nudges favourites up without crowding out variety.
  const eaten = popularity.get(food.id) ?? 0
  if (eaten > 0) {
    score += Math.min(eaten * 0.35, 1.8)
    if (eaten >= 5) reasons.push(`${food.name} is a household favourite 😋`)
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

  // Freshness: foods shown in the last few spins get pushed down so the reels
  // keep rotating through the whole library instead of favouring a handful.
  if (opts.deprioritizeIds?.includes(food.id)) score -= 3

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

// Moisture/texture balance for a lunch/dinner combo: a dry starch wants a
// saucy protein or veg — never an all-dry plate.
function moistureScore(c: {
  base?: Food
  protein?: Food
  veg?: Food
}): { score: number; reason?: string } {
  const items = [c.base, c.protein, c.veg].filter(Boolean) as Food[]
  if (items.length === 0) return { score: 0 }
  const tx = (f?: Food) => f?.texture ?? 'neutral'
  const saucy = items.filter((f) => tx(f) === 'saucy').length
  const dryBase = c.base && tx(c.base) === 'dry'
  const dryProtein = c.protein && tx(c.protein) === 'dry'

  let score = 0
  let reason: string | undefined
  if (dryBase && c.protein && tx(c.protein) === 'saucy') {
    score += 3.5
    reason = `${c.base!.name} + ${c.protein.name} — dry meets saucy 👌`
  }
  if (saucy === 0) {
    // Whole plate is dry/neutral: strongly discouraged.
    score -= 5
    if (dryBase && dryProtein) score -= 2
  } else {
    score += 1.2
  }
  return { score, reason }
}

export function buildCombo(data: AppData, opts: SuggestOptions): ScoredCombo {
  const pref = indexPreferences(data.preferences)
  const lastEaten = lastEatenIndex(data)
  const popularity = eatenCountIndex(data)

  // Never re-suggest a combo already eaten TODAY (any slot), a recent spin, or
  // one a present member has permanently disliked.
  const hardAvoid = new Set([...(opts.avoidSignatures ?? []), ...(opts.dislikedSignatures ?? [])])
  const today = todayISO()
  // Softly avoid combos eaten in the last 2 days so meals space out (~3 days).
  const softAvoid = new Set<string>()
  for (const m of data.meals) {
    const d = daysSince(m.eaten_on)
    if (m.eaten_on === today) hardAvoid.add(mealSignature(m))
    else if (d >= 1 && d <= 2) softAvoid.add(mealSignature(m))
  }

  // Generate a spread of candidates, then rank by taste + balance + freshness.
  const candidates: ScoredCombo[] = []
  const bySig = new Map<string, ScoredCombo>()
  for (let i = 0; i < 32; i++) {
    const c = generateCombo(data, opts, pref, lastEaten, popularity)
    const sig = comboSignature(c)
    const { score: moisture, reason } = moistureScore(c)
    c.score += moisture
    // Foods that don't belong together (two legumes, mash + fish, …) are
    // pushed right down so they effectively never surface.
    c.score -= comboClash(c) * 2
    if (reason) c.reasons = [...new Set([reason, ...c.reasons])].slice(0, 3)
    if (softAvoid.has(sig)) c.score -= 6 // eaten recently — push down
    if (!bySig.has(sig)) {
      bySig.set(sig, c)
      candidates.push(c)
    }
  }

  // Drop anything hard-avoided (today / this session's recent spins).
  let pool = candidates.filter((c) => !hardAvoid.has(comboSignature(c)))
  if (pool.length === 0) pool = candidates

  // Strongly prefer combos with no clash at all, if any exist.
  const clean = pool.filter((c) => comboClash(c) === 0)
  if (clean.length > 0) pool = clean

  // Require a fresh spin to change at least two slots from what's on screen, so
  // consecutive spins never look near-identical. Fall back if the library is
  // too small to offer enough variety.
  if (opts.previous) {
    const slotsPresent =
      (opts.previous.base ? 1 : 0) +
      (opts.previous.protein ? 1 : 0) +
      (opts.previous.veg ? 1 : 0)
    const required = Math.min(2, slotsPresent)
    const varied = pool.filter((c) => comboChanges(c, opts.previous!) >= required)
    if (varied.length > 0) pool = varied
  }

  // Weighted pick by quality so good, balanced, fresh combos win more often —
  // a flatter base than before spreads picks across more of the library.
  const min = Math.min(...pool.map((c) => c.score))
  const weights = pool.map((c) => Math.pow(1.7, c.score - min))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

// Re-roll a single slot of a combo, keeping the others. index 0/1/2 maps to the
// slot's categories (base/protein/veg for a main meal). Returns a *different*
// food that still pairs with what's kept.
export function rerollComponent(
  data: AppData,
  opts: SuggestOptions,
  current: { base?: Food; protein?: Food; veg?: Food },
  index: number,
): Food | undefined {
  const cats = SLOT_CATEGORIES[opts.slot ?? 'dinner']
  const cat = cats[index]
  if (!cat) return undefined

  const pref = indexPreferences(data.preferences)
  const lastEaten = lastEatenIndex(data)
  const popularity = eatenCountIndex(data)
  const currentFood = [current.base, current.protein, current.veg][index]
  const exclude = new Set([currentFood?.id].filter(Boolean) as string[])

  // Pair against the kept base (unless we're re-rolling the base itself).
  const base = index === 0 ? undefined : current.base
  const pairMap =
    base && opts.slot !== 'breakfast' ? CLASSIC_PAIRS[base.id] ?? {} : {}

  // The other two slots we're keeping — the swap shouldn't clash with them.
  const kept = [current.base, current.protein, current.veg].filter(
    (_, i) => i !== index,
  )
  const dietBlocked = dietBlockedFoodIds(data.members, data.foods, opts.presentMemberIds)

  const scores = data.foods
    .filter(
      (f) =>
        f.category === cat &&
        f.suggestable !== false &&
        f.available !== false &&
        !dietBlocked.has(f.id),
    )
    .map((f) => scoreFood(f, pref, lastEaten, popularity, opts))
    .map((s) => ({
      ...s,
      score:
        s.score +
        (pairMap[s.food.id] ?? 0) -
        kept.reduce((sum, k) => sum + pairClash(s.food, k), 0) * 2,
    }))

  return pickWeighted(scores, exclude)?.food ?? currentFood
}

function generateCombo(
  data: AppData,
  opts: SuggestOptions,
  pref: PrefIndex,
  lastEaten: Map<string, string>,
  popularity: Map<string, number>,
): ScoredCombo {
  const exclude = new Set(opts.excludeIds ?? [])
  const slot = opts.slot ?? 'dinner'
  const cats = SLOT_CATEGORIES[slot]
  const dietBlocked = dietBlockedFoodIds(data.members, data.foods, opts.presentMemberIds)

  const byCat = (cat: Food['category']) =>
    data.foods
      .filter(
        (f) =>
          f.category === cat &&
          f.suggestable !== false &&
          f.available !== false &&
          !dietBlocked.has(f.id),
      )
      .map((f) => scoreFood(f, pref, lastEaten, popularity, opts))

  // Slot 1 (base for lunch/dinner, drink for breakfast).
  const first = pickWeighted(byCat(cats[0]), exclude)

  // Classic pairings only apply to the base+protein+veg meals.
  const pairMap =
    slot !== 'breakfast' && first ? CLASSIC_PAIRS[first.food.id] ?? {} : {}

  // Boost classic pairings AND penalise clashes against what's already picked,
  // so a bad combo (two legumes, mash + fish…) rarely forms in the first place.
  const shape = (scores: FoodScore[], kept: (Food | undefined)[]) =>
    scores.map((s) => ({
      ...s,
      score:
        s.score +
        (pairMap[s.food.id] ?? 0) -
        kept.reduce((sum, k) => sum + pairClash(s.food, k), 0),
    }))

  const second = cats[1]
    ? pickWeighted(shape(byCat(cats[1]), [first?.food]), exclude)
    : null
  const third = cats[2]
    ? pickWeighted(shape(byCat(cats[2]), [first?.food, second?.food]), exclude)
    : null

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
// Each wished food anchors a candidate; the rest of the plate is completed with
// the most-wanted foods that also keep the meal balanced (a dry starch gets a
// saucy protein/veg, and every option has at least one saucy element).
export function buildWishCandidates(
  data: AppData,
  wishedOn: string,
  opts: SuggestOptions,
  count = 4,
): ScoredCombo[] {
  const todays = data.wishes.filter((w) => w.wished_on === wishedOn)
  const foodById = new Map(data.foods.map((f) => [f.id, f]))
  const demand = new Map<string, number>()
  for (const w of todays) demand.set(w.food_id, (demand.get(w.food_id) ?? 0) + 1)

  const [baseCat, proteinCat, vegCat] = SLOT_CATEGORIES[opts.slot ?? 'dinner']
  const poolOf = (cat?: FoodCategory) =>
    cat
      ? data.foods.filter(
          (f) => f.category === cat && f.suggestable !== false && f.available !== false,
        )
      : []

  // How well an item completes a plate: wanted foods win, and a dry base pulls
  // for a saucy partner (and pushes away another dry one).
  const fit = (item: Food, base?: Food) => {
    let s = (demand.get(item.id) ?? 0) * 3
    if (base?.texture === 'dry') {
      if (item.texture === 'saucy') s += 2.5
      else if (item.texture === 'dry') s -= 1.5
    }
    return s
  }
  const best = (cat: FoodCategory | undefined, base?: Food, saucyOnly = false) => {
    const pool = poolOf(cat).filter((f) => !saucyOnly || f.texture === 'saucy')
    if (pool.length === 0) return undefined
    return [...pool].sort((a, b) => fit(b, base) - fit(a, base))[0]
  }

  const build = (anchor: Food): ScoredCombo => {
    let base = anchor.category === baseCat ? anchor : best(baseCat)
    let protein = anchor.category === proteinCat ? anchor : best(proteinCat, base)
    let veg = anchor.category === vegCat ? anchor : best(vegCat, base)

    // Guarantee at least one saucy element so it's never an all-dry plate.
    const items = [base, protein, veg].filter(Boolean) as Food[]
    if (items.length && !items.some((f) => f.texture === 'saucy')) {
      if (anchor.category !== vegCat) veg = best(vegCat, base, true) ?? veg
      else if (anchor.category !== proteinCat) protein = best(proteinCat, base, true) ?? protein
    }

    const n = demand.get(anchor.id) ?? 1
    return {
      base,
      protein,
      veg,
      score: n,
      totalCost: (base?.cost ?? 0) + (protein?.cost ?? 0) + (veg?.cost ?? 0),
      reasons: [`${n} wanted ${anchor.name} today 🙌`],
    }
  }

  // Anchor on wished foods, bases first, then proteins, then veg — most-wanted
  // first within each.
  const rank = (f: Food) =>
    f.category === baseCat ? 0 : f.category === proteinCat ? 1 : 2
  const anchors = [...demand.keys()]
    .map((id) => foodById.get(id))
    .filter(
      (f): f is Food =>
        !!f && [baseCat, proteinCat, vegCat].includes(f.category),
    )
    .sort(
      (a, b) => rank(a) - rank(b) || (demand.get(b.id) ?? 0) - (demand.get(a.id) ?? 0),
    )

  const out: ScoredCombo[] = []
  const seen = new Set<string>()
  for (const anchor of anchors) {
    const c = build(anchor)
    const key = comboSignature(c)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
    if (out.length >= count) break
  }

  // Top up with the balanced engine if we still don't have 2 options.
  if (out.length < 2) {
    for (const f of buildCandidates(data, opts, count - out.length)) {
      const key = comboSignature(f)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(f)
      if (out.length >= count) break
    }
  }

  return out.slice(0, count)
}
