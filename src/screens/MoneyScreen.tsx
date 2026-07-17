import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { CountUp } from '../components/ui/CountUp'
import { ExpenseEditor } from '../components/ExpenseEditor'
import {
  spendByCategory,
  spendByDay,
  spendByWeek,
  totalSpentThisMonth,
} from '../engine/stats'
import { formatKES, formatKESShort, relativeDay } from '../lib/format'
import { cn } from '../lib/cn'

const CAT_EMOJI: Record<string, string> = {
  base: '🍚',
  protein: '🍗',
  veg: '🥬',
  drink: '🍵',
  breakfast: '🍳',
  treat: '🍛',
  groceries: '🛒',
  other: '💰',
}

export function MoneyScreen() {
  const { data, removeExpense, removeMeal } = useApp()
  const [adding, setAdding] = useState(false)
  const [openDay, setOpenDay] = useState<string | null>(null)

  const total = totalSpentThisMonth(data)
  const budget = data.settings.monthly_budget
  const pct = budget ? Math.min(100, (total / budget) * 100) : 0
  const overBudget = total > budget

  const days = useMemo(() => spendByDay(data), [data])
  const byWeek = useMemo(() => spendByWeek(data), [data])
  const byCat = useMemo(() => spendByCategory(data), [data])
  const expensesByDay = useMemo(() => {
    const map = new Map<string, typeof data.expenses>()
    for (const e of data.expenses) {
      if (!map.has(e.spent_on)) map.set(e.spent_on, [])
      map.get(e.spent_on)!.push(e)
    }
    return map
  }, [data.expenses])

  const maxWeek = Math.max(1, ...byWeek.map((w) => w.total))
  const maxCat = Math.max(1, ...byCat.map((c) => c.total))
  const avgPerDay = days.length
    ? Math.round(days.reduce((s, d) => s + d.total, 0) / days.length)
    : 0

  return (
    <div className="px-4 pb-4">
      <div className="pt-2">
        <h2 className="font-display text-2xl font-bold tracking-tightish text-charcoal-900 dark:text-cream">
          Food Money 💸
        </h2>
        <p className="text-sm font-medium text-charcoal-800/60 dark:text-cream/50">
          How much we spend each day.
        </p>
      </div>

      {/* Budget bar */}
      <Card className="mt-3 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
              Spent this month
            </p>
            <p className="font-display text-4xl font-bold tracking-tightish text-charcoal-900 dark:text-cream">
              <CountUp value={total} format={(n) => formatKES(n)} />
            </p>
          </div>
          <p className="text-right text-sm font-bold text-charcoal-800/50 dark:text-cream/40">
            of {formatKES(budget)}
          </p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-charcoal-50 dark:bg-charcoal-950">
          <motion.div
            className={cn('h-full rounded-full', overBudget ? 'bg-red-500' : 'bg-avocado-500')}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          <p className={cn('text-sm font-bold', overBudget ? 'text-red-500' : 'text-avocado-600')}>
            {overBudget
              ? `${formatKES(total - budget)} over budget 😬`
              : `${formatKES(budget - total)} left 🎯`}
          </p>
          <p className="text-sm font-bold text-charcoal-800/40 dark:text-cream/40">
            ~{formatKES(avgPerDay)}/day
          </p>
        </div>
      </Card>

      {/* Add */}
      <div className="mt-4">
        <Button fullWidth onClick={() => setAdding(true)}>
          <Plus size={20} /> Log a grocery / extra spend
        </Button>
      </div>

      {/* Spend by day */}
      <h3 className="mt-5 mb-2 font-display text-sm font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
        Spent each day
      </h3>
      <div className="space-y-2">
        {days.map((d) => {
          const isOpen = openDay === d.date
          const dayExpenses = expensesByDay.get(d.date) ?? []
          return (
            <Card key={d.date} className="overflow-hidden">
              <button
                onClick={() => setOpenDay(isOpen ? null : d.date)}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-charcoal-900 dark:text-cream">
                    {relativeDay(d.date)}
                  </p>
                  <p className="truncate text-xs font-medium text-charcoal-800/50 dark:text-cream/40">
                    {d.meals.length
                      ? d.meals.map((m) => m.label).join(', ')
                      : 'Groceries / extras'}
                  </p>
                </div>
                <span className="font-display text-lg font-bold text-charcoal-900 dark:text-cream">
                  {formatKES(d.total)}
                </span>
                <ChevronDown
                  size={18}
                  className={cn(
                    'text-charcoal-800/40 transition-transform dark:text-cream/40',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>

              {isOpen && (
                <div className="border-t border-charcoal-100 px-3.5 py-3 dark:border-charcoal-800">
                  {d.meals.map((m) => (
                    <div key={m.id} className="mb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-bold text-charcoal-900 dark:text-cream">
                          {m.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-charcoal-900 dark:text-cream">
                            {formatKES(m.cost)}
                          </span>
                          <button
                            onClick={() => removeMeal(m.id)}
                            className="text-charcoal-800/30 hover:text-red-500 dark:text-cream/30"
                            aria-label="Delete meal"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {m.component_costs.length > 0 && (
                        <div className="mt-1 space-y-0.5 pl-1">
                          {m.component_costs.map((c, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-xs font-medium text-charcoal-800/55 dark:text-cream/45"
                            >
                              <span>{c.label}</span>
                              <span>{formatKES(c.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {dayExpenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-charcoal-800/70 dark:text-cream/60">
                        {CAT_EMOJI[e.category] ?? '💰'} {e.description}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-charcoal-900 dark:text-cream">
                          {formatKES(e.amount)}
                        </span>
                        <button
                          onClick={() => removeExpense(e.id)}
                          className="text-charcoal-800/30 hover:text-red-500 dark:text-cream/30"
                          aria-label="Delete expense"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}

        {days.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-5xl">🧾</p>
            <p className="mt-2 font-display font-bold text-charcoal-800/60 dark:text-cream/50">
              Nothing spent yet this month. Free food? 👀
            </p>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="mt-5 grid grid-cols-1 gap-3">
        <Card className="p-4">
          <p className="mb-3 font-display font-bold text-charcoal-900 dark:text-cream">
            Spend by week
          </p>
          <div className="flex h-28 items-end justify-between gap-2">
            {byWeek.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                <motion.div
                  className="w-full rounded-t-lg bg-paprika-400"
                  initial={{ height: 0 }}
                  animate={{ height: `${(w.total / maxWeek) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                  style={{ minHeight: 4 }}
                />
                <span className="text-[10px] font-bold text-charcoal-800/50 dark:text-cream/40">
                  {w.label}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {byCat.length > 0 && (
          <Card className="p-4">
            <p className="mb-3 font-display font-bold text-charcoal-900 dark:text-cream">
              Spend by category
            </p>
            <div className="space-y-2">
              {byCat.map((c) => (
                <div key={c.category} className="flex items-center gap-2">
                  <span className="w-6 text-lg">{CAT_EMOJI[c.category] ?? '💰'}</span>
                  <span className="w-20 text-xs font-bold capitalize text-charcoal-800/60 dark:text-cream/50">
                    {c.category}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-charcoal-50 dark:bg-charcoal-950">
                    <motion.div
                      className="h-full rounded-full bg-mango-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.total / maxCat) * 100}%` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                    />
                  </div>
                  <span className="w-14 text-right text-xs font-bold text-charcoal-900 dark:text-cream">
                    {formatKESShort(c.total)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {adding && <ExpenseEditor onClose={() => setAdding(false)} />}
    </div>
  )
}
