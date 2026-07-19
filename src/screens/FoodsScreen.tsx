import { useMemo, useState, type MouseEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Ban, Check, Heart, ListChecks, Pencil, Plus, Search, X } from 'lucide-react'
import { useApp, mealFromCombo } from '../store/AppContext'
import { useNav } from '../store/NavContext'
import type { Food, FoodCategory, MealCost, MealSlot, ScoredCombo } from '../types'
import { Button } from '../components/ui/Button'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { FoodEditor } from '../components/FoodEditor'
import { MealCostSheet } from '../components/MealCostSheet'
import { buildCandidates, comboSignature } from '../engine/suggest'
import { buildVoteFromCombos } from '../lib/buildVote'
import { foodAvgCost } from '../engine/stats'
import { formatKES } from '../lib/format'
import { cn } from '../lib/cn'

const CATEGORIES: { id: FoodCategory; label: string; emoji: string }[] = [
  { id: 'base', label: 'Bases', emoji: '🍚' },
  { id: 'protein', label: 'Proteins', emoji: '🍗' },
  { id: 'veg', label: 'Veggies', emoji: '🥬' },
  { id: 'fruit', label: 'Fruits', emoji: '🍎' },
  { id: 'drink', label: 'Drinks', emoji: '🍵' },
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'treat', label: 'Treats', emoji: '🍩' },
]

// Order plated foods read naturally in a meal.
const PLATE_ORDER: FoodCategory[] = [
  'base',
  'drink',
  'protein',
  'breakfast',
  'veg',
  'fruit',
  'treat',
]
// Categories you can stack several of on one plate.
const MULTI = new Set<FoodCategory>(['treat', 'fruit'])

// After picking a main component, jump to the next one to build a full plate.
const NEXT_MAIN: Partial<Record<FoodCategory, FoodCategory>> = {
  base: 'protein',
  protein: 'veg',
  veg: 'fruit',
}

interface Fly {
  id: number
  emoji: string
  x: number
  y: number
}

export function FoodsScreen() {
  const { data, currentMemberId, setPreference, createVote, logMeal } = useApp()
  const { setTab } = useNav()
  const reduce = useReducedMotion()
  const [cat, setCat] = useState<FoodCategory>('base')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Food | null | undefined>(undefined)

  // The plate being built. Base/protein/veg are single slots; treats and
  // fruits can stack.
  const [plate, setPlate] = useState<Food[]>([])
  const [mealSlot, setMealSlot] = useState<MealSlot>('dinner')
  const [flying, setFlying] = useState<Fly[]>([])
  const [cookOpen, setCookOpen] = useState(false)

  const prefFor = useMemo(() => {
    const map = new Map<string, 'love' | 'refuse'>()
    for (const p of data.preferences) {
      if (p.member_id === currentMemberId) map.set(p.food_id, p.preference)
    }
    return map
  }, [data.preferences, currentMemberId])

  const counts = useMemo(() => {
    const love = new Map<string, number>()
    const refuse = new Map<string, number>()
    for (const p of data.preferences) {
      const m = p.preference === 'love' ? love : refuse
      m.set(p.food_id, (m.get(p.food_id) ?? 0) + 1)
    }
    return { love, refuse }
  }, [data.preferences])

  const foods = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.foods
      .filter((f) => (q ? f.name.toLowerCase().includes(q) : f.category === cat))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data.foods, cat, query])

  const plateFoods = useMemo(
    () => PLATE_ORDER.flatMap((c) => plate.filter((f) => f.category === c)),
    [plate],
  )
  const plateCount = plate.length
  const isComplete = plateCount >= 2
  const isOnPlate = (food: Food) => plate.some((f) => f.id === food.id)

  const togglePref = (food: Food, pref: 'love' | 'refuse') => {
    const current = prefFor.get(food.id)
    setPreference(food.id, current === pref ? null : pref)
  }

  const togglePlate = (food: Food, e: MouseEvent) => {
    const onPlate = isOnPlate(food)
    setPlate((prev) => {
      if (onPlate) return prev.filter((f) => f.id !== food.id)
      if (MULTI.has(food.category)) return [...prev, food]
      // Single slot — replace any existing food of the same category.
      return [...prev.filter((f) => f.category !== food.category), food]
    })
    if (!onPlate) {
      if (!reduce) {
        const id = Math.random()
        setFlying((f) => [...f, { id, emoji: food.emoji, x: e.clientX, y: e.clientY }])
        setTimeout(() => setFlying((f) => f.filter((i) => i.id !== id)), 650)
      }
      // Auto-advance through the main courses (base → protein → veg → fruit)
      // when browsing by tab, so building a plate flows.
      const next = NEXT_MAIN[food.category]
      if (next && !query.trim() && cat === food.category) {
        setTimeout(() => setCat(next), reduce ? 0 : 260)
      }
    }
  }

  const mainBase = plate.find((f) => f.category === 'base' || f.category === 'drink')
  const mainProtein = plate.find(
    (f) => f.category === 'protein' || f.category === 'breakfast',
  )
  const mainVeg = plate.find((f) => f.category === 'veg')

  // Log the plate directly as a meal (with pricing).
  const cookConfirm = async (costs: MealCost[]) => {
    await logMeal(
      mealFromCombo(
        plateFoods.map((f) => f.name).join(' + '),
        mealSlot,
        {
          base_id: mainBase?.id ?? null,
          protein_id: mainProtein?.id ?? null,
          veg_id: mainVeg?.id ?? null,
        },
        0,
        currentMemberId,
        null,
        costs,
      ),
    )
    setCookOpen(false)
    setPlate([])
  }

  // Turn the plate into a vote (plate = first option + a few alternatives).
  const putToVote = async () => {
    const plateCombo: ScoredCombo = {
      base: mainBase,
      protein: mainProtein,
      veg: mainVeg,
      score: 0,
      totalCost: plateFoods.reduce((s, f) => s + f.cost, 0),
      reasons: [],
    }
    const slot = mealSlot
    const alts = buildCandidates(
      data,
      { budgetMode: data.settings.budget_mode, presentMemberIds: data.members.map((m) => m.id), slot },
      4,
    )
    const combos = [plateCombo]
    const seen = new Set([comboSignature(plateCombo)])
    for (const alt of alts) {
      const k = comboSignature(alt)
      if (!seen.has(k)) {
        seen.add(k)
        combos.push(alt)
      }
      if (combos.length >= 4) break
    }
    if (combos.length < 2) return
    const { vote, options } = buildVoteFromCombos(currentMemberId, slot, "What's for dinner?", combos)
    await createVote(vote, options)
    setPlate([])
    setTab('vote')
  }

  return (
    <div className={cn('px-4 pb-4', plateCount > 0 && 'pb-64')}>
      <ScreenHeader
        title="Foods"
        subtitle="Build a plate yourself — then eat it or put it to a vote."
      />

      {/* Search */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-3 ring-1 ring-charcoal-900/[0.05] dark:bg-charcoal-800 dark:ring-white/[0.06]">
        <Search size={18} className="text-charcoal-800/40 dark:text-cream/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all foods…"
          className="w-full bg-transparent text-charcoal-900 outline-none placeholder:text-charcoal-800/40 dark:text-cream dark:placeholder:text-cream/40"
        />
      </div>

      {/* Category tabs */}
      {!query && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                'whitespace-nowrap rounded-full px-3.5 py-1.5 font-display text-sm font-semibold transition-colors',
                cat === c.id
                  ? 'bg-paprika-500 text-white shadow-pop'
                  : 'bg-white text-charcoal-800 dark:bg-charcoal-800 dark:text-cream',
              )}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Food list */}
      <div className="mt-3 space-y-2">
        {foods.map((food, i) => {
          const mine = prefFor.get(food.id)
          const refuses = counts.refuse.get(food.id) ?? 0
          const loves = counts.love.get(food.id) ?? 0
          const onPlate = isOnPlate(food)
          const avg = foodAvgCost(data, food.id)
          return (
            <motion.div
              key={food.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.2) }}
            >
              <div
                onClick={(e) => togglePlate(food, e)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-2.5 ring-1 transition-all active:scale-[0.99] dark:bg-charcoal-800/70',
                  food.available === false && 'opacity-55',
                  onPlate
                    ? 'ring-2 ring-paprika-400'
                    : refuses > 0
                      ? 'ring-red-300/50 dark:ring-red-500/25'
                      : 'ring-charcoal-900/[0.04] dark:ring-white/[0.05]',
                )}
              >
                <div
                  className={cn(
                    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl',
                    onPlate ? 'bg-paprika-100 dark:bg-paprika-500/20' : 'bg-cream dark:bg-charcoal-950',
                  )}
                >
                  {food.emoji}
                  {onPlate && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-paprika-500 text-white ring-2 ring-white dark:ring-charcoal-800">
                      <Check size={13} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold text-charcoal-900 dark:text-cream">
                    {food.name}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-xs font-medium text-charcoal-800/50 dark:text-cream/40">
                    {food.available === false ? (
                      <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-600 dark:bg-red-500/20 dark:text-red-300">
                        Out of stock
                      </span>
                    ) : (
                      food.suggestable === false && (
                        <span className="shrink-0 rounded-full bg-charcoal-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-charcoal-800/60 dark:bg-charcoal-950 dark:text-cream/50">
                          Not suggested
                        </span>
                      )
                    )}
                    <span className="truncate">
                      {avg ? `~${formatKES(avg)} avg` : formatKES(food.cost)} · {food.effort}
                      {loves > 0 && <span className="ml-1">· ❤️{loves}</span>}
                      {refuses > 0 && <span className="ml-1 text-red-500">· 🚫{refuses}</span>}
                    </span>
                  </p>
                </div>

                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => togglePref(food, 'love')}
                    className={cn(
                      'rounded-full p-2 transition-colors',
                      mine === 'love'
                        ? 'bg-paprika-100 text-paprika-600 dark:bg-paprika-500/20'
                        : 'text-charcoal-800/30 hover:bg-black/5 dark:text-cream/30',
                    )}
                    aria-label="Love"
                  >
                    <Heart size={19} fill={mine === 'love' ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => togglePref(food, 'refuse')}
                    className={cn(
                      'rounded-full p-2 transition-colors',
                      mine === 'refuse'
                        ? 'bg-red-100 text-red-600 dark:bg-red-500/20'
                        : 'text-charcoal-800/30 hover:bg-black/5 dark:text-cream/30',
                    )}
                    aria-label="Refuse"
                  >
                    <Ban size={19} />
                  </button>
                  <button
                    onClick={() => setEditing(food)}
                    className="rounded-full p-2 text-charcoal-800/40 hover:bg-black/5 dark:text-cream/40"
                    aria-label="Edit"
                  >
                    <Pencil size={17} />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}

        {foods.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-5xl">🍽️</p>
            <p className="mt-2 font-display font-bold text-charcoal-800/60 dark:text-cream/50">
              {query ? 'No foods match that.' : 'Nothing here yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="mt-4">
        <Button variant="secondary" fullWidth onClick={() => setEditing(null)}>
          <Plus size={20} /> Add a food
        </Button>
      </div>

      {/* Flying emoji → plate */}
      <AnimatePresence>
        {flying.map((f) => (
          <motion.span
            key={f.id}
            className="pointer-events-none fixed left-0 top-0 z-[60] text-3xl"
            initial={{ x: f.x - 16, y: f.y - 16, scale: 1, opacity: 1 }}
            animate={{
              x: (typeof window !== 'undefined' ? window.innerWidth / 2 : 180) - 16,
              y: (typeof window !== 'undefined' ? window.innerHeight - 150 : 600),
              scale: 0.5,
              opacity: 0,
            }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.6, 1] }}
          >
            {f.emoji}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Plate tray */}
      <AnimatePresence>
        {plateCount > 0 && (
          <motion.div
            className="fixed inset-x-0 bottom-[74px] z-20 px-4"
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          >
            <div className="mx-auto max-w-md rounded-3xl bg-white p-3 shadow-pop ring-1 ring-charcoal-900/[0.06] dark:bg-charcoal-800 dark:ring-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  <AnimatePresence>
                    {plateFoods.map((f) => (
                      <motion.span
                        key={f.id}
                        initial={{ scale: 0, y: -6 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', damping: 14, stiffness: 400 }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-lg ring-2 ring-white dark:bg-charcoal-950 dark:ring-charcoal-800"
                      >
                        {f.emoji}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-extrabold text-charcoal-900 dark:text-cream">
                    {isComplete ? 'Plate complete 🎉' : 'Building your plate…'}
                  </p>
                  <p className="truncate text-xs font-medium text-charcoal-800/55 dark:text-cream/45">
                    {plateFoods.map((f) => f.name).join(' + ')}
                  </p>
                </div>
                <button
                  onClick={() => setPlate([])}
                  className="rounded-full p-1.5 text-charcoal-800/40 hover:text-red-500 dark:text-cream/40"
                  aria-label="Clear plate"
                >
                  <X size={18} />
                </button>
              </div>
              {/* Which meal is this? */}
              <div className="mt-3 flex gap-1.5">
                {SLOTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setMealSlot(s.id)}
                    className={cn(
                      'flex-1 rounded-xl py-1.5 font-display text-xs font-bold transition-colors',
                      mealSlot === s.id
                        ? 'bg-paprika-500 text-white'
                        : 'bg-cream text-charcoal-800/60 dark:bg-charcoal-950 dark:text-cream/50',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" onClick={putToVote} className="flex-1">
                  <ListChecks size={17} /> Put to vote
                </Button>
                <Button onClick={() => setCookOpen(true)} className="flex-1">
                  🍽️ Eat this
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {cookOpen && (
        <MealCostSheet
          title="What did it cost?"
          items={plateFoods.map((f) => ({
            food_id: f.id,
            label: f.name,
            suggested: foodAvgCost(data, f.id) ?? f.cost,
          }))}
          confirmLabel="Save meal ✅"
          onClose={() => setCookOpen(false)}
          onConfirm={cookConfirm}
        />
      )}

      {editing !== undefined && (
        <FoodEditor
          food={editing}
          defaultCategory={cat}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  )
}

const SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
]
