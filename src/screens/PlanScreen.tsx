import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { RefreshCw, Shuffle, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { MealSlot, PlannedMeal, ScoredCombo } from '../types'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { buildCombo, comboLabel, comboSignature } from '../engine/suggest'
import { newId } from '../lib/id'
import { cn } from '../lib/cn'

const SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
]

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

// The next 7 days, each with a friendly label.
function nextSevenDays(): { iso: string; label: string; sub: string }[] {
  const out: { iso: string; label: string; sub: string }[] = []
  const base = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const weekday = d.toLocaleDateString(undefined, { weekday: 'long' })
    const sub = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    out.push({
      iso: isoDate(d),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday,
      sub,
    })
  }
  return out
}

export function PlanScreen() {
  const { data, currentMemberId, setPlannedMeal, removePlannedMeal } = useApp()
  const [slot, setSlot] = useState<MealSlot>('dinner')
  const [editing, setEditing] = useState<{ iso: string; label: string } | null>(null)
  const [autoBusy, setAutoBusy] = useState(false)

  const days = useMemo(nextSevenDays, [])
  const foodById = useMemo(() => new Map(data.foods.map((f) => [f.id, f])), [data.foods])

  const planFor = (iso: string) =>
    data.plannedMeals.find((p) => p.plan_date === iso && p.slot === slot)

  const plannedCount = useMemo(
    () => data.plannedMeals.filter((p) => p.slot === slot).length,
    [data.plannedMeals, slot],
  )

  const dislikeSigs = useMemo(
    () => data.comboDislikes.map((x) => x.signature),
    [data.comboDislikes],
  )

  const spin = (avoid: string[] = []): ScoredCombo =>
    buildCombo(data, {
      budgetMode: data.settings.budget_mode,
      presentMemberIds: data.members.map((m) => m.id),
      slot,
      avoidSignatures: avoid,
      dislikedSignatures: dislikeSigs,
    })

  const plannedSig = (p: PlannedMeal) =>
    `${p.base_id ?? ''}|${p.protein_id ?? ''}|${p.veg_id ?? ''}`

  const save = async (iso: string, c: ScoredCombo) => {
    const meal: PlannedMeal = {
      id: newId('plan'),
      plan_date: iso,
      slot,
      label: comboLabel(c),
      base_id: c.base?.id ?? null,
      protein_id: c.protein?.id ?? null,
      veg_id: c.veg?.id ?? null,
      created_by: currentMemberId,
      created_at: new Date().toISOString(),
    }
    await setPlannedMeal(meal)
  }

  // Plan the week so no two days feel the same. Each day avoids every earlier
  // day's exact combo AND deprioritises the last two days' components (base,
  // protein, veg) — so the same protein won't land on back-to-back days — and
  // is required to differ from the day before in at least two slots.
  //   overwrite=false → fill empty days only (existing plans stay, but still
  //     shape what follows). overwrite=true → reshuffle the whole week.
  const runPlan = async (overwrite: boolean) => {
    if (autoBusy) return
    setAutoBusy(true)
    const usedSigs = [...dislikeSigs]
    let windows: string[][] = [] // food ids from the last couple of days
    let prev: { base?: string | null; protein?: string | null; veg?: string | null } | undefined

    const remember = (ids: string[]) => {
      windows = [ids, ...windows].slice(0, 2)
    }

    for (const day of days) {
      const existing = planFor(day.iso)
      if (existing && !overwrite) {
        // Keep it, but let it steer the next day away from repeats.
        usedSigs.push(plannedSig(existing))
        remember(
          [existing.base_id, existing.protein_id, existing.veg_id].filter(Boolean) as string[],
        )
        prev = { base: existing.base_id, protein: existing.protein_id, veg: existing.veg_id }
        continue
      }
      const c = buildCombo(data, {
        budgetMode: data.settings.budget_mode,
        presentMemberIds: data.members.map((m) => m.id),
        slot,
        avoidSignatures: usedSigs,
        dislikedSignatures: dislikeSigs,
        deprioritizeIds: windows.flat(),
        previous: prev,
      })
      if (!comboLabel(c)) continue
      usedSigs.push(comboSignature(c))
      const ids = [c.base?.id, c.protein?.id, c.veg?.id].filter(Boolean) as string[]
      remember(ids)
      prev = { base: c.base?.id ?? null, protein: c.protein?.id ?? null, veg: c.veg?.id ?? null }
      await save(day.iso, c)
    }
    setAutoBusy(false)
  }

  const autoPlan = () => runPlan(false)
  const reshuffle = () => runPlan(true)

  const emojisFor = (p: PlannedMeal) =>
    [p.base_id, p.protein_id, p.veg_id]
      .map((id) => (id ? foodById.get(id)?.emoji : undefined))
      .filter(Boolean)
      .join('')

  return (
    <div className="px-4 pb-4">
      <ScreenHeader title="Plan the week" subtitle="Line up meals for the days ahead — no daily scramble." />

      {/* Slot selector */}
      <div className="mt-4 flex gap-2">
        {SLOTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSlot(s.id)}
            aria-pressed={slot === s.id}
            className={cn(
              'flex-1 rounded-2xl py-2.5 font-display text-sm font-bold transition-colors',
              slot === s.id
                ? 'bg-paprika-500 text-white shadow-pop'
                : 'bg-white text-charcoal-800 ring-1 ring-charcoal-900/[0.05] dark:bg-charcoal-800 dark:text-cream dark:ring-white/[0.06]',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <Button variant="secondary" fullWidth onClick={autoPlan} disabled={autoBusy}>
          {autoBusy ? (
            <Sparkles size={18} className="animate-pulse text-mango-400" />
          ) : (
            <Wand2 size={18} />
          )}
          {autoBusy ? 'Planning…' : 'Auto-plan empty days'}
        </Button>
      </div>

      {/* Days */}
      <div className="mt-4 space-y-2">
        {days.map((day) => {
          const p = planFor(day.iso)
          return (
            <button
              key={day.iso}
              onClick={() => setEditing({ iso: day.iso, label: day.label })}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-charcoal-900/[0.05] transition-transform active:scale-[0.99] dark:bg-charcoal-800/70 dark:ring-white/[0.06]"
            >
              <div className="w-20 shrink-0">
                <p className="font-display text-sm font-extrabold text-charcoal-900 dark:text-cream">
                  {day.label}
                </p>
                <p className="text-[0.7rem] font-semibold text-charcoal-800/45 dark:text-cream/40">
                  {day.sub}
                </p>
              </div>
              {p ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="text-xl leading-none">{emojisFor(p) || '🍽️'}</span>
                  <span className="truncate font-display text-sm font-bold text-charcoal-900 dark:text-cream">
                    {p.label}
                  </span>
                </div>
              ) : (
                <span className="flex-1 text-sm font-semibold text-charcoal-800/40 dark:text-cream/35">
                  Tap to plan…
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Reshuffle — swap the whole week for a fresh, still-varied set */}
      {plannedCount > 0 && (
        <div className="mt-3">
          <Button variant="ghost" fullWidth onClick={reshuffle} disabled={autoBusy}>
            <Shuffle size={17} />
            {autoBusy ? 'Reshuffling…' : 'Reshuffle the whole week'}
          </Button>
          <p className="mt-1.5 text-center text-[0.72rem] font-medium text-charcoal-800/45 dark:text-cream/40">
            Don't love these? Get a fresh set for every day.
          </p>
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <PlanDaySheet
            key={editing.iso}
            dayLabel={editing.label}
            existing={planFor(editing.iso)}
            spin={spin}
            onClose={() => setEditing(null)}
            onSave={async (c) => {
              await save(editing.iso, c)
              setEditing(null)
            }}
            onClear={
              planFor(editing.iso)
                ? async () => {
                    const cur = planFor(editing.iso)
                    if (cur) await removePlannedMeal(cur.id)
                    setEditing(null)
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Sheet to pick/spin a meal for one day.
function PlanDaySheet({
  dayLabel,
  existing,
  spin,
  onClose,
  onSave,
  onClear,
}: {
  dayLabel: string
  existing: PlannedMeal | undefined
  spin: (avoid?: string[]) => ScoredCombo
  onClose: () => void
  onSave: (c: ScoredCombo) => void | Promise<void>
  onClear?: () => void | Promise<void>
}) {
  const [combo, setCombo] = useState<ScoredCombo>(() => spin())
  const [saving, setSaving] = useState(false)
  const reSpin = () => setCombo((c) => spin([comboSignature(c)]))

  return (
    <Sheet open onClose={onClose} title={`Plan ${dayLabel.toLowerCase()}`}>
      {existing && (
        <p className="mb-3 text-sm font-semibold text-charcoal-800/55 dark:text-cream/45">
          Currently planned: <b>{existing.label}</b>
        </p>
      )}
      <div className="rounded-3xl bg-cream p-5 text-center dark:bg-charcoal-950">
        <p className="font-display text-xl font-extrabold text-charcoal-900 dark:text-cream">
          {comboLabel(combo) || 'No meals available'}
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={reSpin} className="flex-1">
          <RefreshCw size={18} /> Spin again
        </Button>
        <Button
          onClick={async () => {
            setSaving(true)
            await onSave(combo)
          }}
          disabled={saving || !comboLabel(combo)}
          className="flex-1"
        >
          Save to {dayLabel.toLowerCase()}
        </Button>
      </div>
      {onClear && (
        <button
          onClick={onClear}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-charcoal-900/[0.04] py-2.5 text-sm font-bold text-charcoal-800/60 ring-1 ring-charcoal-900/[0.06] transition-colors hover:text-red-500 dark:bg-white/[0.05] dark:text-cream/55 dark:ring-white/[0.08]"
        >
          <Trash2 size={15} /> Clear this day
        </button>
      )}
    </Sheet>
  )
}
