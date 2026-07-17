import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { Effort, Food, FoodCategory } from '../types'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { newId } from '../lib/id'
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
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'treat', label: 'Treat' },
]

const EFFORTS: Effort[] = ['Easy', 'Medium', 'Hard']

interface FoodEditorProps {
  food: Food | null // null = new
  defaultCategory: FoodCategory
  onClose: () => void
  onDelete?: () => void
}

export function FoodEditor({ food, defaultCategory, onClose, onDelete }: FoodEditorProps) {
  const { saveFood } = useApp()
  const [name, setName] = useState(food?.name ?? '')
  const [emoji, setEmoji] = useState(food?.emoji ?? '🍲')
  const [category, setCategory] = useState<FoodCategory>(food?.category ?? defaultCategory)
  const [cost, setCost] = useState(String(food?.cost ?? 100))
  const [effort, setEffort] = useState<Effort>(food?.effort ?? 'Medium')
  const [prep, setPrep] = useState(String(food?.prep_minutes ?? 30))

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
      created_at: food?.created_at ?? new Date().toISOString(),
    })
    onClose()
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

        <div className="flex gap-2 pt-1">
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>
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
        'rounded-full px-4 py-2 font-display text-sm font-bold transition-colors',
        active
          ? 'bg-paprika-500 text-white shadow-pop'
          : 'bg-white text-charcoal-800 dark:bg-charcoal-800 dark:text-cream',
      )}
    >
      {children}
    </button>
  )
}
