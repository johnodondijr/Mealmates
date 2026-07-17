import type { AppData, Food, MealEaten } from '../types'
import { currentMonthKey, daysSince, monthKey } from '../lib/format'

// ---- Vote-winner streak -> Chef's Favorite ----
// Count how many closed votes each member's chosen (winning) option they voted for.
export function chefWinCounts(data: AppData): Map<string, number> {
  const counts = new Map<string, number>()
  for (const v of data.votes) {
    if (v.status !== 'closed' || !v.winner_option_id) continue
    // Members who voted for the winning option get a point.
    const winners = data.ballots.filter(
      (b) => b.vote_id === v.id && b.option_id === v.winner_option_id,
    )
    for (const b of winners) {
      counts.set(b.member_id, (counts.get(b.member_id) ?? 0) + 1)
    }
  }
  return counts
}

export function chefFavoriteId(data: AppData): string | null {
  const counts = chefWinCounts(data)
  let best: string | null = null
  let bestN = 0
  for (const [id, n] of counts) {
    if (n > bestN) {
      best = id
      bestN = n
    }
  }
  return bestN > 0 ? best : null
}

export interface ComboCount {
  label: string
  count: number
  emojis: string
}

export function mostEatenCombos(
  data: AppData,
  scope: 'month' | 'all' = 'month',
): ComboCount[] {
  const foodById = new Map(data.foods.map((f) => [f.id, f]))
  const counts = new Map<string, { label: string; count: number; emojis: string }>()
  const mk = currentMonthKey()
  for (const m of data.meals) {
    if (scope === 'month' && monthKey(m.eaten_on) !== mk) continue
    const key = m.label
    const emojis = [m.base_id, m.protein_id, m.veg_id]
      .map((id) => (id ? foodById.get(id)?.emoji : null))
      .filter(Boolean)
      .join('')
    const existing = counts.get(key)
    if (existing) existing.count++
    else counts.set(key, { label: m.label, count: 1, emojis })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
}

export interface FoodFreq {
  food: Food
  count: number
  daysSinceLast: number | null
}

export function foodFrequency(data: AppData): FoodFreq[] {
  const counts = new Map<string, number>()
  const last = new Map<string, string>()
  for (const m of data.meals) {
    for (const id of [m.base_id, m.protein_id, m.veg_id]) {
      if (!id) continue
      counts.set(id, (counts.get(id) ?? 0) + 1)
      const prev = last.get(id)
      if (!prev || m.eaten_on > prev) last.set(id, m.eaten_on)
    }
  }
  return data.foods
    .map((food) => ({
      food,
      count: counts.get(food.id) ?? 0,
      daysSinceLast: last.has(food.id) ? daysSince(last.get(food.id)!) : null,
    }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count)
}

// Calendar heatmap: last `days` days -> the meal eaten (most recent that day).
export interface HeatCell {
  date: string
  meal: MealEaten | null
  emojis: string
}

export function heatmap(data: AppData, days = 28): HeatCell[] {
  const foodById = new Map(data.foods.map((f) => [f.id, f]))
  const byDate = new Map<string, MealEaten>()
  for (const m of data.meals) {
    // keep last-logged per date
    byDate.set(m.eaten_on, m)
  }
  const cells: HeatCell[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const meal = byDate.get(iso) ?? null
    const emojis = meal
      ? [meal.base_id, meal.protein_id, meal.veg_id]
          .map((id) => (id ? foodById.get(id)?.emoji : null))
          .filter(Boolean)
          .join('')
      : ''
    cells.push({ date: iso, meal, emojis })
  }
  return cells
}

// ---- Spend stats ----
// Money spent = what meals actually cost (per-item) + any standalone expenses
// (grocery runs, etc.). The Money view is organised by DAY, not by who paid.
export function monthExpenses(data: AppData, mk = currentMonthKey()) {
  return data.expenses.filter((e) => monthKey(e.spent_on) === mk)
}

export function monthMeals(data: AppData, mk = currentMonthKey()) {
  return data.meals.filter((m) => monthKey(m.eaten_on) === mk)
}

export function totalSpentThisMonth(data: AppData): number {
  const meals = monthMeals(data).reduce((s, m) => s + (m.cost || 0), 0)
  const exps = monthExpenses(data).reduce((s, e) => s + e.amount, 0)
  return meals + exps
}

export interface DaySpend {
  date: string
  total: number
  meals: MealEaten[]
  expenseTotal: number
}

// How much was spent each day this month (most recent first).
export function spendByDay(data: AppData, mk = currentMonthKey()): DaySpend[] {
  const byDate = new Map<string, DaySpend>()
  const ensure = (date: string) => {
    if (!byDate.has(date))
      byDate.set(date, { date, total: 0, meals: [], expenseTotal: 0 })
    return byDate.get(date)!
  }
  for (const m of monthMeals(data, mk)) {
    const d = ensure(m.eaten_on)
    d.meals.push(m)
    d.total += m.cost || 0
  }
  for (const e of monthExpenses(data, mk)) {
    const d = ensure(e.spent_on)
    d.expenseTotal += e.amount
    d.total += e.amount
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
}

// Cost history for one food, pulled from logged meals' itemised costs.
export interface FoodCostPoint {
  date: string
  amount: number
}
export function foodCostHistory(data: AppData, foodId: string): FoodCostPoint[] {
  const points: FoodCostPoint[] = []
  for (const m of data.meals) {
    for (const c of m.component_costs ?? []) {
      if (c.food_id === foodId && c.amount > 0)
        points.push({ date: m.eaten_on, amount: c.amount })
    }
  }
  return points.sort((a, b) => b.date.localeCompare(a.date))
}

export function foodAvgCost(data: AppData, foodId: string): number | null {
  const pts = foodCostHistory(data, foodId)
  if (!pts.length) return null
  return Math.round(pts.reduce((s, p) => s + p.amount, 0) / pts.length)
}

export interface PersonSpend {
  memberId: string
  paid: number
  fairShare: number
  balance: number // positive => owed money, negative => owes
}

export function spendByPerson(data: AppData): PersonSpend[] {
  const exps = monthExpenses(data)
  const total = exps.reduce((s, e) => s + e.amount, 0)
  const share = data.members.length ? total / data.members.length : 0
  return data.members.map((m) => {
    const paid = exps
      .filter((e) => e.paid_by === m.id)
      .reduce((s, e) => s + e.amount, 0)
    return { memberId: m.id, paid, fairShare: share, balance: paid - share }
  })
}

export function spendByCategory(data: AppData): { category: string; total: number }[] {
  const catById = new Map(data.foods.map((f) => [f.id, f.category as string]))
  const map = new Map<string, number>()
  const add = (cat: string, amt: number) =>
    map.set(cat, (map.get(cat) ?? 0) + amt)
  for (const e of monthExpenses(data)) add(e.category, e.amount)
  for (const m of monthMeals(data)) {
    for (const c of m.component_costs ?? []) {
      const cat = (c.food_id && catById.get(c.food_id)) || 'other'
      add(cat, c.amount)
    }
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
}

export function spendByWeek(data: AppData): { label: string; total: number }[] {
  const weeks = [0, 0, 0, 0, 0]
  const bucket = (iso: string, amt: number) => {
    const day = Number(iso.slice(8, 10))
    weeks[Math.min(4, Math.floor((day - 1) / 7))] += amt
  }
  for (const e of monthExpenses(data)) bucket(e.spent_on, e.amount)
  for (const m of monthMeals(data)) bucket(m.eaten_on, m.cost || 0)
  return weeks.map((total, i) => ({ label: `W${i + 1}`, total }))
}

// ---- Household Wrapped ----
export interface Wrapped {
  monthLabel: string
  topMeal: ComboCount | null
  totalSpent: number
  biggestSpender: { name: string; amount: number } | null
  mostRefused: { name: string; count: number } | null
  chefFavorite: { name: string; wins: number } | null
  mealsLogged: number
}

export function buildWrapped(data: AppData): Wrapped {
  const combos = mostEatenCombos(data, 'month')
  const spends = spendByPerson(data)
  const nameById = new Map(data.members.map((m) => [m.id, m.name]))

  const biggest = [...spends].sort((a, b) => b.paid - a.paid)[0]
  const refusedCounts = new Map<string, number>()
  for (const p of data.preferences) {
    if (p.preference === 'refuse')
      refusedCounts.set(p.food_id, (refusedCounts.get(p.food_id) ?? 0) + 1)
  }
  let mostRefused: Wrapped['mostRefused'] = null
  for (const [foodId, count] of refusedCounts) {
    const food = data.foods.find((f) => f.id === foodId)
    if (food && (!mostRefused || count > mostRefused.count))
      mostRefused = { name: food.name, count }
  }

  const chefId = chefFavoriteId(data)
  const chefWins = chefWinCounts(data)

  return {
    monthLabel: new Date().toLocaleDateString('en-KE', {
      month: 'long',
      year: 'numeric',
    }),
    topMeal: combos[0] ?? null,
    totalSpent: totalSpentThisMonth(data),
    biggestSpender:
      biggest && biggest.paid > 0
        ? { name: nameById.get(biggest.memberId) ?? '?', amount: biggest.paid }
        : null,
    mostRefused,
    chefFavorite: chefId
      ? { name: nameById.get(chefId) ?? '?', wins: chefWins.get(chefId) ?? 0 }
      : null,
    mealsLogged: data.meals.filter(
      (m) => monthKey(m.eaten_on) === currentMonthKey(),
    ).length,
  }
}
