import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, PiggyBank, RefreshCw, Sparkles } from 'lucide-react'
import { useApp, mealFromCombo } from '../store/AppContext'
import {
  buildCombo,
  comboLabel,
  comboSignature,
  SLOT_CATEGORIES,
  SLOT_REEL_LABELS,
} from '../engine/suggest'
import type { MealSlot, ScoredCombo } from '../types'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { StatChip } from '../components/ui/StatChip'
import { SlotMachine, type ReelSpec } from '../components/SlotMachine'
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

function comboPrep(c: ScoredCombo): number {
  return (
    (c.base?.prep_minutes ?? 0) +
    (c.protein?.prep_minutes ?? 0) +
    (c.veg?.prep_minutes ?? 0)
  )
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
  // Signatures of the last few results so a re-spin doesn't repeat them.
  const [recentSigs, setRecentSigs] = useState<string[]>([])

  // Reels follow the slot: breakfast = Drink + Breakfast, otherwise Base/Protein/Veg.
  const reelPools = useMemo(() => {
    const cats = SLOT_CATEGORIES[slot]
    return cats.map((cat) =>
      data.foods.filter(
        (f) => f.category === cat && f.suggestable !== false && f.available !== false,
      ),
    )
  }, [data.foods, slot])

  const reels: ReelSpec[] = useMemo(() => {
    const targets = [combo?.base, combo?.protein, combo?.veg]
    const labels = SLOT_REEL_LABELS[slot]
    return reelPools.map((pool, i) => ({ pool, target: targets[i], label: labels[i] }))
  }, [reelPools, combo, slot])

  const roll = (spin: boolean) => {
    const next = buildCombo(data, {
      budgetMode,
      presentMemberIds: present,
      slot,
      avoidSignatures: recentSigs,
    })
    // Remember the last 5 results so consecutive spins keep changing.
    setRecentSigs((prev) => [comboSignature(next), ...prev].slice(0, 5))
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

  const changeSlot = (s: MealSlot) => {
    setSlot(s)
    setCombo(null)
    setRevealed(false)
    setLogged(false)
  }

  return (
    <div className="space-y-6 px-4 pb-6 pt-4">
      <Confetti fire={confetti} onDone={() => setConfetti(false)} />

      {/* Hero */}
      <ScreenHeader
        title="What are we"
        muted="eating today?"
        subtitle={`Hey ${currentMember?.name}, let MealMates settle it.`}
      />

      {/* Slot picker */}
      <div className="flex gap-2">
        {SLOTS.map((s) => (
          <button
            key={s.id}
            onClick={() => changeSlot(s.id)}
            className={cn(
              'flex-1 rounded-2xl py-2.5 font-display text-sm font-semibold transition-colors',
              slot === s.id
                ? 'bg-paprika-500 text-white shadow-pop'
                : 'bg-white text-charcoal-800 ring-1 ring-charcoal-900/[0.04] dark:bg-charcoal-800 dark:text-cream dark:ring-white/[0.06]',
            )}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* Who's eating — sits on the canvas, no heavy container */}
      {data.members.length > 1 && (
        <div>
          <p className="mb-3 px-1 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/45 dark:text-cream/40">
            Who's eating?
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {data.members.map((m) => {
              const on = present.includes(m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => togglePresent(m.id)}
                  className="flex w-[58px] flex-col items-center gap-1.5"
                >
                  <span className="relative">
                    <span className={cn('block transition-all', !on && 'opacity-35 grayscale')}>
                      <Avatar member={m} size={50} />
                    </span>
                    {on && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-avocado-500 text-white ring-2 ring-cream dark:ring-charcoal-950">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'w-full truncate text-center font-display text-xs font-semibold',
                      on
                        ? 'text-charcoal-900 dark:text-cream'
                        : 'text-charcoal-800/40 dark:text-cream/40',
                    )}
                  >
                    {m.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Slot machine — sits open on the canvas */}
      <div className="overflow-hidden">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/45 dark:text-cream/40">
            {SLOT_REEL_LABELS[slot].join(' · ')}
          </span>
          <button
            onClick={() =>
              updateSettings({ ...data.settings, budget_mode: !budgetMode })
            }
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
              budgetMode
                ? 'bg-paprika-500 text-white'
                : 'bg-white text-charcoal-800/60 ring-1 ring-charcoal-900/[0.05] dark:bg-charcoal-800 dark:text-cream/50 dark:ring-white/[0.06]',
            )}
          >
            <PiggyBank size={14} /> Budget {budgetMode ? 'ON' : 'OFF'}
          </button>
        </div>

        <SlotMachine reels={reels} spinning={spinning} onAllStopped={onSpinDone} />

        {/* Reveal details */}
        <AnimatePresence>
          {combo && revealed && !spinning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="rounded-3xl bg-white p-4 ring-1 ring-charcoal-900/[0.05] dark:bg-charcoal-800/70 dark:ring-white/[0.06]">
                <p className="text-center font-display text-[1.35rem] font-extrabold leading-tight tracking-[-0.02em] text-charcoal-900 dark:text-cream">
                  {comboLabel(combo) || 'Add more foods to mix!'}
                </p>
                <p className="mt-1 text-center text-xs font-semibold uppercase tracking-wide text-charcoal-800/40 dark:text-cream/40">
                  {SLOT_REEL_LABELS[slot].join(' · ')}
                </p>

                {comboLabel(combo) && (
                  <div className="mt-3 flex gap-2">
                    <StatChip icon="💰" value={formatKES(combo.totalCost)} label="Cost" />
                    {combo.base && (
                      <StatChip icon="🔥" value={combo.base.effort} label="Effort" />
                    )}
                    <StatChip icon="⏱️" value={`${comboPrep(combo)}m`} label="Time" />
                  </div>
                )}

                {combo.reasons.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {combo.reasons.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-[0.82rem] font-medium text-charcoal-800/65 dark:text-cream/55"
                      >
                        <Sparkles size={14} className="mt-0.5 shrink-0 text-paprika-500" />
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
                      <Check size={18} /> Picked!
                    </>
                  ) : (
                    <>🍽️ Pick this meal</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hero action — spins the reels to decide. Once revealed, the result
          card carries the actions (Spin again / Cook it up). */}
      {!revealed && (
        <div>
          <Button
            size="lg"
            onClick={() => roll(true)}
            disabled={spinning}
            fullWidth
            className="py-4 text-lg"
          >
            {spinning ? (
              <>
                <Sparkles size={20} className="animate-pulse text-mango-400" /> Spinning…
              </>
            ) : (
              <>🎰 Spin for a meal</>
            )}
          </Button>
          <p className="mt-2 text-center text-xs font-medium text-charcoal-800/45 dark:text-cream/40">
            Spin the reels for a smart, balanced pick
          </p>
        </div>
      )}

      {costOpen && combo && (
        <MealCostSheet
          title="What did it cost?"
          items={costItems(combo)}
          confirmLabel="Save meal ✅"
          onClose={() => setCostOpen(false)}
          onConfirm={logWithCosts}
        />
      )}
    </div>
  )
}
