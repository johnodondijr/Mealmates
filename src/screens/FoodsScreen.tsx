import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Ban, Check, Heart, Pencil, Plus, Search, Utensils, Vote } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useNav } from '../store/NavContext'
import type { Food, FoodCategory, MealSlot } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { FoodEditor } from '../components/FoodEditor'
import { buildWishCandidates } from '../engine/suggest'
import { buildVoteFromCombos } from '../lib/buildVote'
import { foodAvgCost } from '../engine/stats'
import { formatKES, todayISO } from '../lib/format'
import { cn } from '../lib/cn'

const CATEGORIES: { id: FoodCategory; label: string; emoji: string }[] = [
  { id: 'base', label: 'Bases', emoji: '🍚' },
  { id: 'protein', label: 'Proteins', emoji: '🍗' },
  { id: 'veg', label: 'Veggies', emoji: '🥬' },
  { id: 'drink', label: 'Drinks', emoji: '🍵' },
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'treat', label: 'Treats', emoji: '🍛' },
]

export function FoodsScreen() {
  const { data, currentMemberId, setPreference, setWish, createVote } = useApp()
  const { setTab } = useNav()
  const [cat, setCat] = useState<FoodCategory>('base')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Food | null | undefined>(undefined)
  const today = todayISO()

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

  // Who wants each food today.
  const wishers = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const w of data.wishes) {
      if (w.wished_on !== today) continue
      if (!map.has(w.food_id)) map.set(w.food_id, [])
      map.get(w.food_id)!.push(w.member_id)
    }
    return map
  }, [data.wishes, today])

  const myWishCount = useMemo(
    () => data.wishes.filter((w) => w.wished_on === today && w.member_id === currentMemberId).length,
    [data.wishes, today, currentMemberId],
  )
  const totalWishesToday = useMemo(
    () => new Set(data.wishes.filter((w) => w.wished_on === today).map((w) => w.food_id)).size,
    [data.wishes, today],
  )

  const foods = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.foods
      .filter((f) => (q ? f.name.toLowerCase().includes(q) : f.category === cat))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data.foods, cat, query])

  const memberById = useMemo(
    () => new Map(data.members.map((m) => [m.id, m])),
    [data.members],
  )

  const togglePref = (food: Food, pref: 'love' | 'refuse') => {
    const current = prefFor.get(food.id)
    setPreference(food.id, current === pref ? null : pref)
  }

  const toggleWish = (food: Food) => {
    const on = wishers.get(food.id)?.includes(currentMemberId) ?? false
    setWish(food.id, !on)
  }

  const makeVoteFromPicks = async () => {
    const combos = buildWishCandidates(
      data,
      today,
      { budgetMode: data.settings.budget_mode, presentMemberIds: data.members.map((m) => m.id) },
      4,
    )
    if (combos.length < 2) return
    const slot: MealSlot = 'dinner'
    const { vote, options } = buildVoteFromCombos(
      currentMemberId,
      slot,
      "Today's picks",
      combos,
    )
    await createVote(vote, options)
    setTab('vote')
  }

  return (
    <div className="px-4 pb-4">
      <ScreenHeader
        title="Food Library"
        subtitle={
          <>
            Tap a food to pick it for today. Use the icons to love, refuse or edit.
          </>
        }
      />

      {/* Today's picks CTA */}
      {totalWishesToday > 0 && (
        <Card className="mt-3 flex items-center gap-3 border-2 border-avocado-300 bg-avocado-50 p-3 dark:border-avocado-500/30 dark:bg-avocado-500/10">
          <Utensils size={20} className="shrink-0 text-avocado-600" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-charcoal-900 dark:text-cream">
              {totalWishesToday} food{totalWishesToday === 1 ? '' : 's'} picked for today
            </p>
            <p className="text-xs font-medium text-charcoal-800/60 dark:text-cream/50">
              You've picked {myWishCount}. Turn everyone's picks into a vote.
            </p>
          </div>
          <Button size="sm" onClick={makeVoteFromPicks}>
            <Vote size={16} /> Vote
          </Button>
        </Card>
      )}

      {/* Search */}
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-card dark:bg-charcoal-800">
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
          const todaysWishers = wishers.get(food.id) ?? []
          const iWant = todaysWishers.includes(currentMemberId)
          const avg = foodAvgCost(data, food.id)
          return (
            <motion.div
              key={food.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.2) }}
            >
              <div
                onClick={() => toggleWish(food)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-2.5 ring-1 transition-all active:scale-[0.99] dark:bg-charcoal-800/70',
                  iWant
                    ? 'ring-2 ring-paprika-400'
                    : refuses > 0
                      ? 'ring-red-300/50 dark:ring-red-500/25'
                      : 'ring-charcoal-900/[0.04] dark:ring-white/[0.05]',
                )}
              >
                <div
                  className={cn(
                    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl',
                    iWant ? 'bg-paprika-100 dark:bg-paprika-500/20' : 'bg-cream dark:bg-charcoal-950',
                  )}
                >
                  {food.emoji}
                  {iWant && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-avocado-500 text-white">
                      <Check size={13} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-display font-bold text-charcoal-900 dark:text-cream">
                      {food.name}
                    </p>
                    {food.suggestable === false && (
                      <span className="shrink-0 rounded-full bg-charcoal-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-charcoal-800/60 dark:bg-charcoal-950 dark:text-cream/50">
                        Not suggested
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs font-medium text-charcoal-800/50 dark:text-cream/40">
                    {avg ? `~${formatKES(avg)} avg` : formatKES(food.cost)} · {food.effort}
                    {loves > 0 && <span className="ml-1">· ❤️{loves}</span>}
                    {refuses > 0 && <span className="ml-1 text-red-500">· 🚫{refuses}</span>}
                  </p>
                </div>

                {/* wisher avatars */}
                {todaysWishers.length > 0 && (
                  <div className="flex -space-x-2">
                    {todaysWishers.map((id) => {
                      const m = memberById.get(id)
                      return m ? <Avatar key={id} member={m} size={22} ring /> : null
                    })}
                  </div>
                )}

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
        <Button fullWidth onClick={() => setEditing(null)}>
          <Plus size={20} /> Add a food
        </Button>
      </div>

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
