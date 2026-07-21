import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, PiggyBank, RefreshCw, Sparkles, X } from 'lucide-react'
import { useApp, mealFromCombo } from '../store/AppContext'
import {
  buildCombo,
  comboLabel,
  comboSignature,
  rerollComponent,
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
  const {
    data,
    currentMemberId,
    currentMember,
    logMeal,
    updateSettings,
    setComboDislike,
    onlineMemberIds,
    presenceEnabled,
  } = useApp()
  const onlineSet = new Set(onlineMemberIds)
  const budgetMode = data.settings.budget_mode

  const [slot, setSlot] = useState<MealSlot>('dinner')
  const [present, setPresent] = useState<string[]>(() => data.members.map((m) => m.id))
  const [combo, setCombo] = useState<ScoredCombo | null>(null)
  const [spinningSlots, setSpinningSlots] = useState<boolean[]>([])
  const [revealed, setRevealed] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [logged, setLogged] = useState(false)
  const [costOpen, setCostOpen] = useState(false)
  // Signatures of the last few results so a re-spin doesn't repeat them.
  const [recentSigs, setRecentSigs] = useState<string[]>([])
  // Foods shown in the last couple of spins — down-weighted for variety.
  const [recentFoodIds, setRecentFoodIds] = useState<string[]>([])
  // A fruit to round off the meal, and whether the user added it.
  const [fruit, setFruit] = useState<Food | null>(null)
  const [fruitAdded, setFruitAdded] = useState(false)
  // Signature just disliked (drives the undo banner).
  const [dislikeSig, setDislikeSig] = useState<string | null>(null)
  const [tipDismissed, setTipDismissed] = useState(
    () => localStorage.getItem('mealmates.tip1') === '1',
  )
  const showTip = !tipDismissed && data.meals.length === 0
  const dismissTip = () => {
    setTipDismissed(true)
    localStorage.setItem('mealmates.tip1', '1')
  }

  const spinning = spinningSlots.some(Boolean)

  // Combos any present member has disliked — never suggest these to them.
  const dislikedSignatures = useMemo(
    () =>
      data.comboDislikes
        .filter((x) => present.includes(x.member_id))
        .map((x) => x.signature),
    [data.comboDislikes, present],
  )

  // Suggestable fruits for the "finish with a fruit" nudge.
  const fruitPool = useMemo(
    () =>
      data.foods.filter(
        (f) => f.category === 'fruit' && f.suggestable !== false && f.available !== false,
      ),
    [data.foods],
  )
  const pickFruit = (excludeId?: string): Food | null => {
    const pool = fruitPool.filter((f) => f.id !== excludeId)
    const src = pool.length ? pool : fruitPool
    return src.length ? src[Math.floor(Math.random() * src.length)] : null
  }
  const swapFruit = () => setFruit((f) => pickFruit(f?.id))

  // Recently eaten meals for this slot — a quick way to bring one back.
  const foodById = useMemo(() => new Map(data.foods.map((f) => [f.id, f])), [data.foods])
  const recentMeals = useMemo(() => {
    const seen = new Set<string>()
    const out: typeof data.meals = []
    const sorted = [...data.meals].sort(
      (a, b) =>
        b.eaten_on.localeCompare(a.eaten_on) || b.created_at.localeCompare(a.created_at),
    )
    for (const m of sorted) {
      if (m.slot !== slot || !m.base_id) continue
      if (seen.has(m.label)) continue
      seen.add(m.label)
      out.push(m)
      if (out.length >= 4) break
    }
    return out
  }, [data.meals, slot])

  const mealEmojis = (m: (typeof data.meals)[number]) =>
    [m.base_id, m.protein_id, m.veg_id]
      .map((id) => (id ? foodById.get(id)?.emoji : undefined))
      .filter(Boolean)
      .join('')

  // Load a past meal into the reveal, as if it had just been spun.
  const loadMeal = (m: (typeof data.meals)[number]) => {
    const base = m.base_id ? foodById.get(m.base_id) : undefined
    const protein = m.protein_id ? foodById.get(m.protein_id) : undefined
    const veg = m.veg_id ? foodById.get(m.veg_id) : undefined
    setCombo({
      base,
      protein,
      veg,
      score: 0,
      totalCost: (base?.cost ?? 0) + (protein?.cost ?? 0) + (veg?.cost ?? 0),
      reasons: ['Brought back from your history 🕘'],
    })
    setFruit(null)
    setFruitAdded(false)
    setLogged(false)
    setRevealed(true)
    setSpinningSlots(reelPools.map(() => false))
  }

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
    return reelPools.map((pool, i) => ({
      pool,
      target: targets[i],
      label: labels[i],
      spinning: spinningSlots[i] ?? false,
    }))
  }, [reelPools, combo, slot, spinningSlots])

  // Reveal once every reel that was spinning has settled. (Confetti is saved
  // for when a meal is actually chosen — see logWithCosts — so it never covers
  // the result you're still reading.)
  useEffect(() => {
    if (combo && spinningSlots.length > 0 && spinningSlots.every((s) => !s) && !revealed) {
      setRevealed(true)
    }
  }, [spinningSlots, combo, revealed])

  // Full spin — all reels. `extraDisliked` lets a just-disliked combo be
  // avoided immediately, before the reload propagates.
  const roll = (extraDisliked: string[] = []) => {
    const previous = combo
      ? {
          base: combo.base?.id ?? null,
          protein: combo.protein?.id ?? null,
          veg: combo.veg?.id ?? null,
        }
      : undefined
    const next = buildCombo(data, {
      budgetMode,
      presentMemberIds: present,
      slot,
      avoidSignatures: recentSigs,
      dislikedSignatures: [...dislikedSignatures, ...extraDisliked],
      deprioritizeIds: recentFoodIds,
      previous,
    })
    setRecentSigs((prev) => [comboSignature(next), ...prev].slice(0, 5))
    const nextFoods = [next.base?.id, next.protein?.id, next.veg?.id].filter(
      Boolean,
    ) as string[]
    setRecentFoodIds((prev) => [...nextFoods, ...prev].slice(0, 6))
    setCombo(next)
    setFruit(pickFruit())
    setFruitAdded(false)
    setLogged(false)
    setRevealed(false)
    setSpinningSlots(reelPools.map(() => true))
  }

  // "Don't suggest this combo to me again" — record it, then spin a fresh one.
  const dislikeThis = () => {
    if (!combo) return
    const sig = comboSignature(combo)
    setComboDislike(sig, true)
    setDislikeSig(sig)
    setTimeout(() => setDislikeSig((s) => (s === sig ? null : s)), 5000)
    roll([sig])
  }
  const undoDislike = () => {
    if (!dislikeSig) return
    setComboDislike(dislikeSig, false)
    setDislikeSig(null)
  }

  // Re-spin just one slot, keeping the rest.
  const swapSlot = (i: number) => {
    if (!combo) return
    const newFood = rerollComponent(
      data,
      { budgetMode, presentMemberIds: present, slot },
      { base: combo.base, protein: combo.protein, veg: combo.veg },
      i,
    )
    if (!newFood) return
    setCombo((c) => {
      if (!c) return c
      const fields = ['base', 'protein', 'veg'] as const
      const updated = { ...c, [fields[i]]: newFood } as ScoredCombo
      updated.totalCost =
        (updated.base?.cost ?? 0) + (updated.protein?.cost ?? 0) + (updated.veg?.cost ?? 0)
      updated.reasons = ['Swapped one part — kept the rest 🔄']
      return updated
    })
    setLogged(false)
    setSpinningSlots((s) => s.map((v, idx) => (idx === i ? true : v)))
  }

  const onReelStopped = (i: number) => {
    setSpinningSlots((s) => s.map((v, idx) => (idx === i ? false : v)))
  }

  const togglePresent = (id: string) => {
    setPresent((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  const costItems = (c: ScoredCombo) => {
    const items = [c.base, c.protein, c.veg].filter(Boolean) as Food[]
    if (fruitAdded && fruit) items.push(fruit)
    return items.map((f) => ({
      food_id: f.id,
      label: f.name,
      suggested: foodAvgCost(data, f.id) ?? f.cost,
    }))
  }

  const logWithCosts = async (costs: MealCost[]) => {
    if (!combo) return
    const label =
      comboLabel(combo) + (fruitAdded && fruit ? ` + ${fruit.name}` : '')
    await logMeal(
      mealFromCombo(
        label,
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
    setFruit(null)
    setFruitAdded(false)
    setSpinningSlots([])
    setRevealed(false)
    setLogged(false)
  }

  return (
    <div className="space-y-6 px-4 pb-6 pt-4">
      <Confetti fire={confetti} onDone={() => setConfetti(false)} />

      {/* Hero */}
      <ScreenHeader
        title="What's for"
        muted={`${SLOTS.find((s) => s.id === slot)?.label.toLowerCase() ?? slot}?`}
        subtitle={`Hey ${currentMember?.name}! Tap Spin and I'll pick a balanced meal — or build your own in Foods.`}
      />

      {/* First-run tip */}
      {showTip && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-mango-50 p-3 ring-1 ring-mango-200 dark:bg-mango-500/10 dark:ring-mango-500/25">
          <span className="text-lg leading-none">👋</span>
          <p className="flex-1 text-sm font-medium leading-snug text-charcoal-800/80 dark:text-cream/75">
            Two ways to decide: <b>spin</b> for a smart, balanced pick here — or head to{' '}
            <b>Foods</b> to build a plate yourself and put it to a vote.
          </p>
          <button
            onClick={dismissTip}
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-1 text-charcoal-800/40 hover:text-charcoal-900 dark:text-cream/40"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
                    {presenceEnabled && onlineSet.has(m.id) && (
                      <span className="absolute -left-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-avocado-500 ring-2 ring-cream dark:ring-charcoal-950" />
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
      <div>
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

        <SlotMachine
          reels={reels}
          onReelStopped={onReelStopped}
          onSwap={revealed && !spinning ? swapSlot : undefined}
        />

        {/* Reveal details */}
        <AnimatePresence>
          {combo && revealed && !spinning && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
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
                  <p className="mt-1 text-center text-[0.72rem] font-medium text-charcoal-800/45 dark:text-cream/40">
                    Tap ↻ on a reel to swap just that part
                  </p>
                )}

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

                {/* Finish with a fruit — a light nudge toward a rounded meal */}
                {slot !== 'breakfast' && fruit && comboLabel(combo) && (
                  <div
                    className={cn(
                      'mt-3 flex items-center gap-2.5 rounded-2xl px-3 py-2.5 ring-1 transition-colors',
                      fruitAdded
                        ? 'bg-avocado-50 ring-avocado-300 dark:bg-avocado-500/10 dark:ring-avocado-500/30'
                        : 'bg-cream ring-charcoal-900/[0.05] dark:bg-charcoal-950 dark:ring-white/[0.06]',
                    )}
                  >
                    <button
                      onClick={() => setFruitAdded((a) => !a)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <span className="text-2xl">{fruit.emoji}</span>
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-charcoal-900 dark:text-cream">
                          Finish with {fruit.name}
                        </p>
                        <p className="text-[0.72rem] font-semibold text-charcoal-800/45 dark:text-cream/40">
                          {fruitAdded ? 'Added — counts in your meal' : 'A fruit to round it off · tap to add'}
                        </p>
                      </div>
                    </button>
                    {fruitAdded ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-avocado-500 text-white">
                        <Check size={16} strokeWidth={3} />
                      </span>
                    ) : (
                      <button
                        onClick={swapFruit}
                        aria-label="Suggest another fruit"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-charcoal-800/50 ring-1 ring-charcoal-900/[0.06] active:scale-90 dark:bg-charcoal-800 dark:text-cream/50 dark:ring-white/[0.06]"
                      >
                        <RefreshCw size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => roll()} className="flex-1">
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
                    <>🍽️ Eat this</>
                  )}
                </Button>
              </div>

              {/* Personal dislike — never suggest this exact combo to me again */}
              {comboLabel(combo) && !logged && (
                <button
                  onClick={dislikeThis}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-charcoal-900/[0.04] py-2.5 text-[0.82rem] font-bold text-charcoal-800/60 ring-1 ring-charcoal-900/[0.06] transition-colors hover:bg-red-50 hover:text-red-500 hover:ring-red-200 active:scale-[0.99] dark:bg-white/[0.05] dark:text-cream/55 dark:ring-white/[0.08] dark:hover:bg-red-500/10 dark:hover:text-red-300"
                >
                  👎 Not this combo — don't suggest it to me
                </button>
              )}
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
            onClick={() => roll()}
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

          {/* Bring back a recent meal for this slot */}
          {recentMeals.length > 0 && !spinning && (
            <div className="mt-6">
              <p className="mb-2 px-1 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/45 dark:text-cream/40">
                Had recently
              </p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {recentMeals.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => loadMeal(m)}
                    className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-charcoal-900/[0.05] transition-transform active:scale-95 dark:bg-charcoal-800 dark:ring-white/[0.06]"
                  >
                    <span className="text-lg leading-none">{mealEmojis(m) || '🍽️'}</span>
                    <span className="max-w-[8.5rem] truncate font-display text-xs font-bold text-charcoal-900 dark:text-cream">
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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

      {/* Undo banner after disliking a combo */}
      <AnimatePresence>
        {dislikeSig && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed inset-x-0 bottom-[84px] z-30 px-4"
          >
            <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-charcoal-900/95 px-4 py-3 shadow-pop dark:bg-charcoal-800">
              <p className="flex-1 text-sm font-semibold text-cream">
                Got it — won't suggest that to you again.
              </p>
              <button
                onClick={undoDislike}
                className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-cream"
              >
                Undo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
