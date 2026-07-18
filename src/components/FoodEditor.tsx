import { useMemo, useState } from 'react'
import { PackageCheck, Plus, Sparkles, Trash2, TrendingUp, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { Effort, Food, FoodCategory, Ingredient, Texture } from '../types'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { newId } from '../lib/id'
import { foodCostHistory } from '../engine/stats'
import { formatKES, relativeDay } from '../lib/format'
import { cn } from '../lib/cn'

const FOOD_EMOJIS = [
  '🍚','🌽','🫓','🍝','🥔','🍌','🍟','🫘','🥩','🍗','🐟','🥚','🌭','🍖','🥬',
  '🥗','🌿','🥑','🍞','🥣','🥞','🍩','🍳','🥛','🍛','🥟','🍲','🍜','🌮',
  '🧀','🍅','🥕','🌶️','🧅','🍠','🥘','🫕','🍤','🦐','🥦','🍄','🥜','🍯',
]

const CATEGORIES: { id: FoodCategory; label: string }[] = [
  { id: 'base', label: 'Base' },
  { id: 'protein', label: 'Protein' },
  { id: 'veg', label: 'Veg' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'drink', label: 'Drink' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'treat', label: 'Treat' },
]

const EFFORTS: Effort[] = ['Easy', 'Medium', 'Hard']

const TEXTURES: { id: Texture; label: string }[] = [
  { id: 'dry', label: '🍞 Dry' },
  { id: 'saucy', label: '🥘 Saucy' },
  { id: 'neutral', label: '⚖️ Neutral' },
]

interface FoodEditorProps {
  food: Food | null // null = new
  defaultCategory: FoodCategory
  onClose: () => void
}

interface IngredientDraft extends Ingredient {}

export function FoodEditor({ food, defaultCategory, onClose }: FoodEditorProps) {
  const { data, saveFood, removeFood } = useApp()
  const [name, setName] = useState(food?.name ?? '')
  const [emoji, setEmoji] = useState(food?.emoji ?? '🍲')
  const [category, setCategory] = useState<FoodCategory>(food?.category ?? defaultCategory)
  const [cost, setCost] = useState(String(food?.cost ?? 100))
  const [effort, setEffort] = useState<Effort>(food?.effort ?? 'Medium')
  const [prep, setPrep] = useState(String(food?.prep_minutes ?? 30))
  const [texture, setTexture] = useState<Texture>(food?.texture ?? 'neutral')
  const [suggestable, setSuggestable] = useState(food?.suggestable ?? true)
  const [available, setAvailable] = useState(food?.available ?? true)
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    () => food?.ingredients ?? [],
  )

  const history = useMemo(
    () => (food ? foodCostHistory(data, food.id) : []),
    [data, food],
  )
  const avg = history.length
    ? Math.round(history.reduce((s, p) => s + p.amount, 0) / history.length)
    : null
  const ingredientTotal = ingredients.reduce((s, i) => s + (Number(i.cost) || 0), 0)

  const addIngredient = () =>
    setIngredients((xs) => [...xs, { id: newId('ing'), name: '', cost: 0 }])
  const setIng = (id: string, patch: Partial<Ingredient>) =>
    setIngredients((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const removeIng = (id: string) =>
    setIngredients((xs) => xs.filter((x) => x.id !== id))

  const save = async () => {
    if (!name.trim()) return
    await saveFood({
      id: food?.id ?? newId('food'),
      name: name.trim(),
      emoji,
      category,
      cost: Number(cost) || 0,
      effort,
      prep_minutes: Number(prep) || 0,
      texture,
      suggestable,
      available,
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({ ...i, name: i.name.trim(), cost: Number(i.cost) || 0 })),
      created_at: food?.created_at ?? new Date().toISOString(),
    })
    onClose()
  }

  const del = async () => {
    if (food) {
      await removeFood(food.id)
      onClose()
    }
  }

  return (
    <Sheet open onClose={onClose} title={food ? 'Edit food' : 'Add a food'}>
      <div className="space-y-4">
        {/* Emoji + name */}
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl shadow-card dark:bg-charcoal-800">
            {emoji}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Food name"
            autoFocus
            className="flex-1 rounded-2xl bg-white px-4 py-3 font-display text-lg font-bold text-charcoal-900 shadow-card outline-none ring-paprika-300 focus:ring-2 dark:bg-charcoal-800 dark:text-cream"
          />
        </div>

        {/* Emoji picker */}
        <div className="no-scrollbar flex flex-wrap gap-1.5">
          {FOOD_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-transform active:scale-90',
                emoji === e
                  ? 'bg-paprika-100 ring-2 ring-paprika-400 dark:bg-paprika-500/20'
                  : 'bg-white dark:bg-charcoal-800',
              )}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Category */}
        <div>
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <Toggle
          icon={<Sparkles size={20} />}
          title="Suggest in meals"
          on={suggestable}
          onChange={() => setSuggestable((s) => !s)}
          onText="The decider can propose this food."
          offText="Kept as an option, but never auto-suggested."
        />
        <Toggle
          icon={<PackageCheck size={20} />}
          title="Available / in reach"
          on={available}
          onChange={() => setAvailable((a) => !a)}
          onText="We have this — it can be suggested."
          offText="Out of stock — hidden from suggestions until back."
        />

        {/* Cost + prep */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Cost (KES)</Label>
            <input
              type="number"
              inputMode="numeric"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full rounded-2xl bg-white px-4 py-3 font-bold text-charcoal-900 shadow-card outline-none dark:bg-charcoal-800 dark:text-cream"
            />
          </div>
          <div>
            <Label>Prep (mins)</Label>
            <input
              type="number"
              inputMode="numeric"
              value={prep}
              onChange={(e) => setPrep(e.target.value)}
              className="w-full rounded-2xl bg-white px-4 py-3 font-bold text-charcoal-900 shadow-card outline-none dark:bg-charcoal-800 dark:text-cream"
            />
          </div>
        </div>

        {/* Effort */}
        <div>
          <Label>Effort</Label>
          <div className="flex gap-2">
            {EFFORTS.map((e) => (
              <Chip key={e} active={effort === e} onClick={() => setEffort(e)}>
                {e}
              </Chip>
            ))}
          </div>
        </div>

        {/* Texture — powers balanced pairing (dry ↔ saucy) */}
        <div>
          <Label>Texture</Label>
          <div className="flex gap-2">
            {TEXTURES.map((t) => (
              <Chip key={t.id} active={texture === t.id} onClick={() => setTexture(t.id)}>
                {t.label}
              </Chip>
            ))}
          </div>
          <p className="mt-1 text-xs font-medium text-charcoal-800/45 dark:text-cream/40">
            Dry foods (ugali, chapati) get paired with a saucy protein or veg.
          </p>
        </div>

        {/* Ingredients */}
        <div>
          <Label>Ingredients (optional)</Label>
          <div className="space-y-2">
            {ingredients.map((ing) => (
              <div key={ing.id} className="flex items-center gap-2">
                <input
                  value={ing.name}
                  onChange={(e) => setIng(ing.id, { name: e.target.value })}
                  placeholder="e.g. Maize flour"
                  className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2.5 font-semibold text-charcoal-900 shadow-card outline-none dark:bg-charcoal-800 dark:text-cream"
                />
                <div className="flex items-center gap-1 rounded-2xl bg-white px-3 py-2.5 shadow-card dark:bg-charcoal-800">
                  <span className="text-xs font-bold text-charcoal-800/40 dark:text-cream/40">KES</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={ing.cost || ''}
                    onChange={(e) => setIng(ing.id, { cost: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-14 bg-transparent text-right font-bold text-charcoal-900 outline-none dark:text-cream"
                  />
                </div>
                <button
                  onClick={() => removeIng(ing.id)}
                  className="rounded-full p-1.5 text-charcoal-800/30 hover:text-red-500 dark:text-cream/30"
                  aria-label="Remove ingredient"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={addIngredient}
              className="flex items-center gap-1.5 rounded-full bg-charcoal-50 px-3 py-2 text-sm font-bold text-charcoal-800/70 dark:bg-charcoal-800 dark:text-cream/60"
            >
              <Plus size={15} /> Add ingredient
            </button>
            {ingredients.length > 0 && (
              <button
                onClick={() => setCost(String(ingredientTotal))}
                className="rounded-full bg-avocado-100 px-3 py-2 text-sm font-bold text-avocado-700 dark:bg-avocado-500/20"
              >
                Total {formatKES(ingredientTotal)} → set cost
              </button>
            )}
          </div>
        </div>

        {/* Price history */}
        {food && history.length > 0 && (
          <div className="rounded-2xl bg-cream p-3 dark:bg-charcoal-950">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp size={16} className="text-mango-600" />
              <p className="font-display text-sm font-bold text-charcoal-900 dark:text-cream">
                Price history · avg {avg !== null ? formatKES(avg) : '—'}
              </p>
            </div>
            <div className="space-y-1">
              {history.slice(0, 6).map((p, i) => (
                <div
                  key={i}
                  className="flex justify-between text-sm font-medium text-charcoal-800/70 dark:text-cream/60"
                >
                  <span>{relativeDay(p.date)}</span>
                  <span className="font-bold">{formatKES(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {food && (
            <Button variant="danger" onClick={del}>
              <Trash2 size={18} />
            </Button>
          )}
          <Button onClick={save} fullWidth disabled={!name.trim()}>
            {food ? 'Save changes' : 'Add food'}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

function Toggle({
  icon,
  title,
  on,
  onChange,
  onText,
  offText,
}: {
  icon: React.ReactNode
  title: string
  on: boolean
  onChange: () => void
  onText: string
  offText: string
}) {
  return (
    <button
      onClick={onChange}
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-charcoal-900/[0.05] dark:bg-charcoal-800 dark:ring-white/[0.06]"
    >
      <span className={on ? 'text-avocado-500' : 'text-charcoal-800/30 dark:text-cream/30'}>
        {icon}
      </span>
      <div className="flex-1">
        <p className="font-display font-bold text-charcoal-900 dark:text-cream">{title}</p>
        <p className="text-xs font-medium text-charcoal-800/50 dark:text-cream/40">
          {on ? onText : offText}
        </p>
      </div>
      <span
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          on ? 'bg-avocado-500' : 'bg-charcoal-200 dark:bg-charcoal-950',
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white transition-all',
            on ? 'left-6' : 'left-1',
          )}
        />
      </span>
    </button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
      {children}
    </p>
  )
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-2 font-display text-sm font-semibold transition-colors',
        active
          ? 'bg-paprika-500 text-white shadow-pop'
          : 'bg-white text-charcoal-800 dark:bg-charcoal-800 dark:text-cream',
      )}
    >
      {children}
    </button>
  )
}
