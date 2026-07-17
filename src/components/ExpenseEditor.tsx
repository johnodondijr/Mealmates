import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Expense } from '../types'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { newId } from '../lib/id'
import { todayISO } from '../lib/format'
import { cn } from '../lib/cn'

interface ExpenseEditorProps {
  onClose: () => void
}

const CATEGORIES: { id: Expense['category']; label: string; emoji: string }[] = [
  { id: 'groceries', label: 'Groceries', emoji: '🛒' },
  { id: 'protein', label: 'Protein', emoji: '🍗' },
  { id: 'base', label: 'Base', emoji: '🍚' },
  { id: 'veg', label: 'Veg', emoji: '🥬' },
  { id: 'drink', label: 'Drink', emoji: '🍵' },
  { id: 'treat', label: 'Treat', emoji: '🍛' },
  { id: 'other', label: 'Other', emoji: '💰' },
]

export function ExpenseEditor({ onClose }: ExpenseEditorProps) {
  const { currentMemberId, addExpense } = useApp()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Expense['category']>('groceries')
  const [date, setDate] = useState(todayISO())

  const save = async () => {
    const amt = Number(amount)
    if (!amt || !description.trim()) return
    await addExpense({
      id: newId('exp'),
      amount: amt,
      description: description.trim(),
      category,
      paid_by: currentMemberId,
      spent_on: date,
      meal_id: null,
      created_at: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="Log an expense">
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
            Amount (KES)
          </p>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
            className="w-full rounded-2xl bg-white px-4 py-4 font-display text-3xl font-extrabold text-charcoal-900 shadow-card outline-none ring-paprika-300 focus:ring-2 dark:bg-charcoal-800 dark:text-cream"
          />
        </div>

        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was it for?"
          className="w-full rounded-2xl bg-white px-4 py-3 font-bold text-charcoal-900 shadow-card outline-none dark:bg-charcoal-800 dark:text-cream"
        />

        <div>
          <p className="mb-1.5 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
            Category
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  'rounded-full px-3 py-2 font-display text-sm font-bold transition-colors',
                  category === c.id
                    ? 'bg-paprika-500 text-white shadow-pop'
                    : 'bg-white text-charcoal-800 dark:bg-charcoal-800 dark:text-cream',
                )}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
            Date
          </p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl bg-white px-4 py-3 font-bold text-charcoal-900 shadow-card outline-none dark:bg-charcoal-800 dark:text-cream"
          />
        </div>

        <Button fullWidth onClick={save} disabled={!Number(amount) || !description.trim()}>
          Save expense
        </Button>
      </div>
    </Sheet>
  )
}
