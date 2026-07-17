import { useMemo, useState } from 'react'
import { useApp, mealFromCombo } from '../store/AppContext'
import type { Food, MealSlot } from '../types'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { comboLabel } from '../engine/suggest'
import { todayISO, formatKES } from '../lib/format'
import { cn } from '../lib/cn'

interface LogMealSheetProps {
  onClose: () => void
}

const SLOTS: { id: MealSlot; label: string; emoji: string }[] = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '☀️' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙' },
]

export function LogMealSheet({ onClose }: LogMealSheetProps) {
  const { data, currentMemberId, logMeal } = useApp()
  const [slot, setSlot] = useState<MealSlot>('dinner')
  const [date, setDate] = useState(todayISO())
  const [base, setBase] = useState<Food | null>(null)
  const [protein, setProtein] = useState<Food | null>(null)
  const [veg, setVeg] = useState<Food | null>(null)

  const bases = data.foods.filter((f) => f.category === 'base')
  const proteins = data.foods.filter((f) => f.category === 'protein')
  const vegs = data.foods.filter((f) => f.category === 'veg')

  const combo = { base: base ?? undefined, protein: protein ?? undefined, veg: veg ?? undefined }
  const label = comboLabel(combo)
  const cost = (base?.cost ?? 0) + (protein?.cost ?? 0) + (veg?.cost ?? 0)

  const canSave = useMemo(() => Boolean(label), [label])

  const save = async () => {
    if (!canSave) return
    const meal = mealFromCombo(
      label,
      slot,
      {
        base_id: base?.id ?? null,
        protein_id: protein?.id ?? null,
        veg_id: veg?.id ?? null,
      },
      cost,
      currentMemberId,
    )
    // Manual entries respect the chosen date.
    meal.eaten_on = date
    await logMeal(meal)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="Log a meal">
      <div className="space-y-4">
        <div className="flex justify-center gap-2">
          {SLOTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSlot(s.id)}
              className={cn(
                'rounded-full px-4 py-1.5 font-display text-sm font-bold transition-colors',
                slot === s.id
                  ? 'bg-paprika-500 text-white shadow-pop'
                  : 'bg-white text-charcoal-800 dark:bg-charcoal-800 dark:text-cream',
              )}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        <FoodRow title="Base 🍚" foods={bases} selected={base} onSelect={setBase} />
        <FoodRow title="Protein 🍗" foods={proteins} selected={protein} onSelect={setProtein} />
        <FoodRow title="Veg 🥬" foods={vegs} selected={veg} onSelect={setVeg} />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-2xl bg-white px-4 py-3 font-bold text-charcoal-900 shadow-card outline-none dark:bg-charcoal-800 dark:text-cream"
        />

        <div className="rounded-2xl bg-cream p-3 text-center dark:bg-charcoal-950">
          <p className="font-display font-extrabold text-charcoal-900 dark:text-cream">
            {label || 'Pick at least one food'}
          </p>
          {cost > 0 && (
            <p className="text-sm font-bold text-charcoal-800/50 dark:text-cream/40">
              {formatKES(cost)}
            </p>
          )}
        </div>

        <Button fullWidth onClick={save} disabled={!canSave}>
          Log it ✅
        </Button>
      </div>
    </Sheet>
  )
}

function FoodRow({
  title,
  foods,
  selected,
  onSelect,
}: {
  title: string
  foods: Food[]
  selected: Food | null
  onSelect: (f: Food | null) => void
}) {
  return (
    <div>
      <p className="mb-1.5 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
        {title}
      </p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {foods.map((f) => {
          const on = selected?.id === f.id
          return (
            <button
              key={f.id}
              onClick={() => onSelect(on ? null : f)}
              className={cn(
                'flex shrink-0 flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-all',
                on
                  ? 'bg-paprika-100 ring-2 ring-paprika-400 dark:bg-paprika-500/20'
                  : 'bg-white dark:bg-charcoal-800',
              )}
            >
              <span className="text-2xl">{f.emoji}</span>
              <span className="max-w-[4.5rem] truncate font-display text-[11px] font-bold text-charcoal-900 dark:text-cream">
                {f.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
