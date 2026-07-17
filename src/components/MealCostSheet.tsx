import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { MealCost } from '../types'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { formatKES } from '../lib/format'

interface SeedItem {
  food_id: string | null
  label: string
  suggested: number
}

interface MealCostSheetProps {
  title?: string
  subtitle?: string
  items: SeedItem[]
  confirmLabel?: string
  onClose: () => void
  onConfirm: (costs: MealCost[]) => void | Promise<void>
}

interface Line extends MealCost {
  key: string
}

// Enter what each part of a meal actually cost today. Prefilled with the
// food's usual price; add extra lines for oil, spices, etc.
export function MealCostSheet({
  title = 'What did it cost?',
  subtitle = "Enter what each item actually cost today — builds each food's price history.",
  items,
  confirmLabel = 'Save & log meal 🍳',
  onClose,
  onConfirm,
}: MealCostSheetProps) {
  const [lines, setLines] = useState<Line[]>(() =>
    items.map((it, i) => ({
      key: `seed_${i}`,
      food_id: it.food_id,
      label: it.label,
      amount: it.suggested,
    })),
  )
  const [saving, setSaving] = useState(false)

  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0)

  const setAmount = (key: string, value: string) =>
    setLines((ls) =>
      ls.map((l) => (l.key === key ? { ...l, amount: Number(value) || 0 } : l)),
    )
  const setLabel = (key: string, value: string) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, label: value } : l)))
  const removeLine = (key: string) =>
    setLines((ls) => ls.filter((l) => l.key !== key))
  const addLine = () =>
    setLines((ls) => [
      ...ls,
      { key: `extra_${Date.now()}`, food_id: null, label: '', amount: 0 },
    ])

  const confirm = async () => {
    setSaving(true)
    const costs: MealCost[] = lines
      .filter((l) => l.label.trim() || l.amount > 0)
      .map(({ food_id, label, amount }) => ({
        food_id,
        label: label.trim() || 'Item',
        amount: Number(amount) || 0,
      }))
    await onConfirm(costs)
  }

  return (
    <Sheet open onClose={onClose} title={title}>
      <p className="mb-4 text-sm font-medium text-charcoal-800/60 dark:text-cream/50">
        {subtitle}
      </p>

      <div className="space-y-2">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center gap-2">
            <input
              value={l.label}
              onChange={(e) => setLabel(l.key, e.target.value)}
              placeholder="Item (e.g. Oil)"
              className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2.5 font-semibold text-charcoal-900 shadow-card outline-none dark:bg-charcoal-800 dark:text-cream"
            />
            <div className="flex items-center gap-1 rounded-2xl bg-white px-3 py-2.5 shadow-card dark:bg-charcoal-800">
              <span className="text-xs font-bold text-charcoal-800/40 dark:text-cream/40">
                KES
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={l.amount || ''}
                onChange={(e) => setAmount(l.key, e.target.value)}
                placeholder="0"
                className="w-16 bg-transparent text-right font-bold text-charcoal-900 outline-none dark:text-cream"
              />
            </div>
            <button
              onClick={() => removeLine(l.key)}
              className="rounded-full p-1.5 text-charcoal-800/30 hover:bg-black/5 hover:text-red-500 dark:text-cream/30"
              aria-label="Remove line"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addLine}
        className="mt-3 flex items-center gap-1.5 rounded-full bg-charcoal-50 px-3 py-2 text-sm font-bold text-charcoal-800/70 dark:bg-charcoal-800 dark:text-cream/60"
      >
        <Plus size={15} /> Add item (oil, spices…)
      </button>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-cream p-3 dark:bg-charcoal-950">
        <span className="font-bold text-charcoal-800/60 dark:text-cream/50">Total</span>
        <span className="font-display text-2xl font-bold text-charcoal-900 dark:text-cream">
          {formatKES(total)}
        </span>
      </div>

      <Button fullWidth onClick={confirm} disabled={saving} className="mt-4">
        {confirmLabel}
      </Button>
    </Sheet>
  )
}
