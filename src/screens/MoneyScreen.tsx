import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { CountUp } from '../components/ui/CountUp'
import { ExpenseEditor } from '../components/ExpenseEditor'
import {
  monthExpenses,
  spendByCategory,
  spendByPerson,
  spendByWeek,
  totalSpentThisMonth,
} from '../engine/stats'
import { formatKES, formatKESShort, relativeDay } from '../lib/format'
import { cn } from '../lib/cn'

const CAT_EMOJI: Record<string, string> = {
  base: '🍚',
  protein: '🍗',
  veg: '🥬',
  breakfast: '🍳',
  treat: '🍛',
  groceries: '🛒',
  other: '💰',
}

export function MoneyScreen() {
  const { data, removeExpense } = useApp()
  const [adding, setAdding] = useState(false)

  const total = totalSpentThisMonth(data)
  const budget = data.settings.monthly_budget
  const pct = budget ? Math.min(100, (total / budget) * 100) : 0
  const overBudget = total > budget

  const byPerson = useMemo(() => spendByPerson(data), [data])
  const byWeek = useMemo(() => spendByWeek(data), [data])
  const byCat = useMemo(() => spendByCategory(data), [data])
  const expenses = useMemo(
    () =>
      [...monthExpenses(data)].sort((a, b) => b.spent_on.localeCompare(a.spent_on)),
    [data],
  )
  const nameById = useMemo(
    () => new Map(data.members.map((m) => [m.id, m])),
    [data.members],
  )

  const maxWeek = Math.max(1, ...byWeek.map((w) => w.total))
  const maxCat = Math.max(1, ...byCat.map((c) => c.total))

  // Settle-up: who owes whom (greedy).
  const settlements = useMemo(() => computeSettlements(byPerson, nameById), [byPerson, nameById])

  return (
    <div className="px-4 pb-4">
      <div className="pt-2">
        <h2 className="font-display text-2xl font-extrabold text-charcoal-900 dark:text-cream">
          Food Money 💸
        </h2>
        <p className="text-sm font-semibold text-charcoal-800/60 dark:text-cream/50">
          This month's spending & who's behind.
        </p>
      </div>

      {/* Budget ring / bar */}
      <Card className="mt-3 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
              Spent this month
            </p>
            <p className="font-display text-4xl font-extrabold text-charcoal-900 dark:text-cream">
              <CountUp value={total} format={(n) => formatKES(n)} />
            </p>
          </div>
          <p className="text-right text-sm font-bold text-charcoal-800/50 dark:text-cream/40">
            of {formatKES(budget)}
          </p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-charcoal-50 dark:bg-charcoal-950">
          <motion.div
            className={cn(
              'h-full rounded-full',
              overBudget ? 'bg-red-500' : 'bg-avocado-500',
            )}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>
        <p
          className={cn(
            'mt-2 text-sm font-bold',
            overBudget ? 'text-red-500' : 'text-avocado-600',
          )}
        >
          {overBudget
            ? `${formatKES(total - budget)} over budget 😬`
            : `${formatKES(budget - total)} left 🎯`}
        </p>
      </Card>

      {/* Split / balances */}
      <h3 className="mt-5 mb-2 font-display text-sm font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
        Who paid what
      </h3>
      <Card className="p-4">
        <div className="space-y-3">
          {byPerson.map((p) => {
            const m = nameById.get(p.memberId)
            if (!m) return null
            return (
              <div key={p.memberId} className="flex items-center gap-3">
                <Avatar member={m} size={34} />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-display font-bold text-charcoal-900 dark:text-cream">
                      {m.name}
                    </span>
                    <span className="font-bold text-charcoal-900 dark:text-cream">
                      {formatKES(p.paid)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      'text-xs font-bold',
                      p.balance >= 0 ? 'text-avocado-600' : 'text-paprika-500',
                    )}
                  >
                    {p.balance >= 0
                      ? `+${formatKES(p.balance)} ahead`
                      : `${formatKES(Math.abs(p.balance))} behind`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {settlements.length > 0 && (
          <div className="mt-4 border-t border-charcoal-100 pt-3 dark:border-charcoal-800">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
              Settle up
            </p>
            <div className="space-y-1.5">
              {settlements.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm font-bold text-charcoal-900 dark:text-cream"
                >
                  <span>{s.from}</span>
                  <ArrowRight size={14} className="text-paprika-500" />
                  <span>{s.to}</span>
                  <span className="ml-auto text-avocado-600">{formatKES(s.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

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

      {/* Add */}
      <div className="mt-5">
        <Button fullWidth onClick={() => setAdding(true)}>
          <Plus size={20} /> Log an expense
        </Button>
      </div>

      {/* Expense list */}
      <h3 className="mt-5 mb-2 font-display text-sm font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
        Recent expenses
      </h3>
      <div className="space-y-2">
        {expenses.map((e) => {
          const m = nameById.get(e.paid_by)
          return (
            <Card key={e.id} className="flex items-center gap-3 p-3">
              <span className="text-2xl">{CAT_EMOJI[e.category] ?? '💰'}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-bold text-charcoal-900 dark:text-cream">
                  {e.description}
                </p>
                <p className="text-xs font-semibold text-charcoal-800/50 dark:text-cream/40">
                  {m?.name} · {relativeDay(e.spent_on)}
                </p>
              </div>
              <span className="font-display font-extrabold text-charcoal-900 dark:text-cream">
                {formatKES(e.amount)}
              </span>
              <button
                onClick={() => removeExpense(e.id)}
                className="rounded-full p-1.5 text-charcoal-800/30 hover:bg-black/5 hover:text-red-500 dark:text-cream/30"
                aria-label="Delete"
              >
                <Trash2 size={16} />
              </button>
            </Card>
          )
        })}
        {expenses.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-5xl">🧾</p>
            <p className="mt-2 font-display font-bold text-charcoal-800/60 dark:text-cream/50">
              No spending logged yet. Free food? 👀
            </p>
          </div>
        )}
      </div>

      {adding && <ExpenseEditor onClose={() => setAdding(false)} />}
    </div>
  )
}

interface Settlement {
  from: string
  to: string
  amount: number
}

function computeSettlements(
  byPerson: ReturnType<typeof spendByPerson>,
  nameById: Map<string, { name: string }>,
): Settlement[] {
  const debtors = byPerson
    .filter((p) => p.balance < -1)
    .map((p) => ({ id: p.memberId, amt: -p.balance }))
    .sort((a, b) => b.amt - a.amt)
  const creditors = byPerson
    .filter((p) => p.balance > 1)
    .map((p) => ({ id: p.memberId, amt: p.balance }))
    .sort((a, b) => b.amt - a.amt)

  const out: Settlement[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt)
    out.push({
      from: nameById.get(debtors[i].id)?.name ?? '?',
      to: nameById.get(creditors[j].id)?.name ?? '?',
      amount: pay,
    })
    debtors[i].amt -= pay
    creditors[j].amt -= pay
    if (debtors[i].amt < 1) i++
    if (creditors[j].amt < 1) j++
  }
  return out
}
