import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Ban, Heart, Pencil, Plus, Search } from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { Food, FoodCategory } from '../types'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { FoodEditor } from '../components/FoodEditor'
import { formatKES } from '../lib/format'
import { cn } from '../lib/cn'

const CATEGORIES: { id: FoodCategory; label: string; emoji: string }[] = [
  { id: 'base', label: 'Bases', emoji: '🍚' },
  { id: 'protein', label: 'Proteins', emoji: '🍗' },
  { id: 'veg', label: 'Veggies', emoji: '🥬' },
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'treat', label: 'Treats', emoji: '🍛' },
]

export function FoodsScreen() {
  const { data, currentMemberId, currentMember, setPreference, removeFood } = useApp()
  const [cat, setCat] = useState<FoodCategory>('base')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Food | null | undefined>(undefined) // undefined = closed

  const prefFor = useMemo(() => {
    const map = new Map<string, 'love' | 'refuse'>()
    for (const p of data.preferences) {
      if (p.member_id === currentMemberId) map.set(p.food_id, p.preference)
    }
    return map
  }, [data.preferences, currentMemberId])

  const refuseCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of data.preferences) {
      if (p.preference === 'refuse')
        map.set(p.food_id, (map.get(p.food_id) ?? 0) + 1)
    }
    return map
  }, [data.preferences])

  const loveCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of data.preferences) {
      if (p.preference === 'love') map.set(p.food_id, (map.get(p.food_id) ?? 0) + 1)
    }
    return map
  }, [data.preferences])

  const foods = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.foods
      .filter((f) => (q ? f.name.toLowerCase().includes(q) : f.category === cat))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data.foods, cat, query])

  const toggle = (food: Food, pref: 'love' | 'refuse') => {
    const current = prefFor.get(food.id)
    setPreference(food.id, current === pref ? null : pref)
  }

  return (
    <div className="px-4 pb-4">
      <div className="pt-2">
        <h2 className="font-display text-2xl font-extrabold text-charcoal-900 dark:text-cream">
          Food Library 🍲
        </h2>
        <p className="text-sm font-semibold text-charcoal-800/60 dark:text-cream/50">
          Tag what {currentMember?.name} loves ❤️ or refuses 🚫
        </p>
      </div>

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
                'whitespace-nowrap rounded-full px-3.5 py-1.5 font-display text-sm font-bold transition-colors',
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
          const refuses = refuseCount.get(food.id) ?? 0
          const loves = loveCount.get(food.id) ?? 0
          return (
            <motion.div
              key={food.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.2) }}
            >
              <Card
                className={cn(
                  'flex items-center gap-3 p-3',
                  refuses > 0 && 'ring-1 ring-red-300/60 dark:ring-red-500/30',
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream text-2xl dark:bg-charcoal-950">
                  {food.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold text-charcoal-900 dark:text-cream">
                    {food.name}
                  </p>
                  <p className="text-xs font-semibold text-charcoal-800/50 dark:text-cream/40">
                    {formatKES(food.cost)} · {food.effort} · {food.prep_minutes}m
                    {loves > 0 && <span className="ml-1">· ❤️{loves}</span>}
                    {refuses > 0 && <span className="ml-1 text-red-500">· 🚫{refuses}</span>}
                  </p>
                </div>
                <button
                  onClick={() => toggle(food, 'love')}
                  className={cn(
                    'rounded-full p-2 transition-colors',
                    mine === 'love'
                      ? 'bg-paprika-100 text-paprika-600 dark:bg-paprika-500/20'
                      : 'text-charcoal-800/30 hover:bg-black/5 dark:text-cream/30',
                  )}
                  aria-label="Love"
                >
                  <Heart size={20} fill={mine === 'love' ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => toggle(food, 'refuse')}
                  className={cn(
                    'rounded-full p-2 transition-colors',
                    mine === 'refuse'
                      ? 'bg-red-100 text-red-600 dark:bg-red-500/20'
                      : 'text-charcoal-800/30 hover:bg-black/5 dark:text-cream/30',
                  )}
                  aria-label="Refuse"
                >
                  <Ban size={20} />
                </button>
                <button
                  onClick={() => setEditing(food)}
                  className="rounded-full p-2 text-charcoal-800/40 hover:bg-black/5 dark:text-cream/40"
                  aria-label="Edit"
                >
                  <Pencil size={18} />
                </button>
              </Card>
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
          onDelete={
            editing
              ? async () => {
                  await removeFood(editing.id)
                  setEditing(undefined)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
