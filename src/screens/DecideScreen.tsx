import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronRight,
  Clock,
  PiggyBank,
  RefreshCw,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { useApp, mealFromCombo } from '../store/AppContext'
import { buildCombo, comboLabel } from '../engine/suggest'
import type { MealSlot, ScoredCombo } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { SlotMachine } from '../components/SlotMachine'
import { Confetti } from '../components/Confetti'
import { MealCostSheet } from '../components/MealCostSheet'
import { foodAvgCost } from '../engine/stats'
import { formatKES } from '../lib/format'
import { cn } from '../lib/cn'
import type { Food, MealCost } from '../types'

const SLOTS: { id: MealSlot; label: string; emoji: string }[] = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '☀️' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙' },
]

function effortColor(effort?: string) {
  if (effort === 'Easy') return 'text-avocado-600 bg-avocado-100 dark:bg-avocado-500/20'
  if (effort === 'Hard') return 'text-paprika-600 bg-paprika-100 dark:bg-paprika-500/20'
  return 'text-mango-700 bg-mango-100 dark:bg-mango-500/20'
}

export function DecideScreen() {
  const { data, currentMemberId, currentMember, logMeal, updateSettings } = useApp()
  const budgetMode = data.settings.budget_mode

  const [slot, setSlot] = useState<MealSlot>('dinner')
  const [present, setPresent] = useState<string[]>(() => data.members.map((m) => m.id))
  const [combo, setCombo] = useState<ScoredCombo | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [logged, setLogged] = useState(false)
  const [costOpen, setCostOpen] = useState(false)

  const pools = useMemo(
    () => ({
      bases: data.foods.filter((f) => f.category === 'base'),
      proteins: data.foods.filter((f) => f.category === 'protein'),
      vegs: data.foods.filter((f) => f.category === 'veg'),
    }),
    [data.foods],
  )

  const roll = (spin: boolean) => {
    const next = buildCombo(data, { budgetMode, presentMemberIds: present })
    setCombo(next)
    setLogged(false)
    if (spin) {
      setRevealed(false)
      setSpinning(true)
    } else {
      setSpinning(false)
      setRevealed(true)
      setConfetti(true)
    }
  }

  const onSpinDone = () => {
    setSpinning(false)
    setRevealed(true)
    setConfetti(true)
  }

  const togglePresent = (id: string) => {
    setPresent((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  const costItems = (c: ScoredCombo) =>
    ([c.base, c.protein, c.veg].filter(Boolean) as Food[]).map((f) => ({
      food_id: f.id,
      label: f.name,
      suggested: foodAvgCost(data, f.id) ?? f.cost,
    }))

  const logWithCosts = async (costs: MealCost[]) => {
    if (!combo) return
    await logMeal(
      mealFromCombo(
        comboLabel(combo),
        slot,
        {
          base_id: combo.base?.id ?? null,
          protein_id: combo.protein?.id ?? null,
          veg_id: combo.veg?.id ?? null,
        },
        combo.totalCost,
        currentMemberId,
        null,
        costs,
      ),
    )
    setCostOpen(false)
    setLogged(true)
    setConfetti(true)
  }

  return (
    <div className="space-y-5 px-4 pb-4">
      <Confetti fire={confetti} onDone={() => setConfetti(false)} />

      {/* Hero */}
      <div className="pt-2 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl font-extrabold text-charcoal-900 dark:text-cream"
        >
          What are we eating? 🤔
        </motion.h2>
        <p className="mt-1 text-sm font-semibold text-charcoal-800/60 dark:text-cream/50">
          Hey {currentMember?.name}, let MealMates settle it.
        </p>
      </div>

      {/* Slot picker */}
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

      {/* Who's here */}
      <Card className="p-4">
        <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
          Who's eating?
        </p>
        <div className="flex flex-wrap gap-2">
          {data.members.map((m) => {
            const on = present.includes(m.id)
            return (
              <button
                key={m.id}
                onClick={() => togglePresent(m.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 transition-all',
                  on
                    ? 'bg-avocado-100 ring-2 ring-avocado-400 dark:bg-avocado-500/20'
                    : 'bg-charcoal-50 opacity-50 dark:bg-charcoal-800',
                )}
              >
                <Avatar member={m} size={26} />
                <span className="font-display text-sm font-bold text-charcoal-900 dark:text-cream">
                  {m.name}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Slot machine */}
      <Card className="overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-sm font-bold text-charcoal-800/60 dark:text-cream/50">
            🎰 Base · Protein · Veg
          </span>
          <button
            onClick={() =>
              updateSettings({ ...data.settings, budget_mode: !budgetMode })
            }
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors',
              budgetMode
                ? 'bg-avocado-500 text-white'
                : 'bg-charcoal-50 text-charcoal-800/60 dark:bg-charcoal-800 dark:text-cream/50',
            )}
          >
            <PiggyBank size={14} /> Budget {budgetMode ? 'ON' : 'OFF'}
          </button>
        </div>

        <SlotMachine
          bases={pools.bases}
          proteins={pools.proteins}
          vegs={pools.vegs}
          target={combo}
          spinning={spinning}
          onAllStopped={onSpinDone}
        />

        {/* Reveal details */}
        <AnimatePresence>
          {combo && revealed && !spinning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="rounded-2xl bg-cream p-3 dark:bg-charcoal-950">
                <p className="text-center font-display text-lg font-extrabold text-charcoal-900 dark:text-cream">
                  {comboLabel(combo) || 'Add more foods to mix!'}
                </p>
                <div className="mt-2 flex items-center justify-center gap-2 text-sm">
                  <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-bold text-charcoal-800 dark:bg-charcoal-800 dark:text-cream">
                    <Wallet size={13} /> {formatKES(combo.totalCost)}
                  </span>
                  {combo.base && (
                    <span
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2.5 py-1 font-bold',
                        effortColor(combo.base.effort),
                      )}
                    >
                      <Clock size={13} /> {combo.base.effort}
                    </span>
                  )}
                </div>
                {combo.reasons.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {combo.reasons.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-sm font-semibold text-charcoal-800/70 dark:text-cream/60"
                      >
                        <Sparkles size={14} className="mt-0.5 shrink-0 text-mango-500" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => roll(true)} className="flex-1">
                  <RefreshCw size={18} /> Spin again
                </Button>
                <Button
                  onClick={() => setCostOpen(true)}
                  disabled={logged || !comboLabel(combo)}
                  className="flex-1"
                >
                  {logged ? (
                    <>
                      <Check size={18} /> Logged!
                    </>
                  ) : (
                    <>🍳 Cook it up</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Hero actions */}
      <div className="grid grid-cols-1 gap-3">
        <Button size="lg" onClick={() => roll(false)} fullWidth className="py-5 text-xl">
          🍲 Decide for us
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => roll(true)}
          fullWidth
          className="py-4"
        >
          <Sparkles size={20} className="text-mango-500" /> Surprise Me (spin!)
          <ChevronRight size={18} />
        </Button>
      </div>

      {costOpen && combo && (
        <MealCostSheet
          title="Cook it up 🍳"
          items={costItems(combo)}
          confirmLabel="Log meal & costs ✅"
          onClose={() => setCostOpen(false)}
          onConfirm={logWithCosts}
        />
      )}
    </div>
  )
}
