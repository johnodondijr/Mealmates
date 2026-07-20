import { useMemo, useState } from 'react'
import { RefreshCw, Utensils, Wand2, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useNav } from '../store/NavContext'
import type { MealSlot, ScoredCombo, Vote, VoteOption } from '../types'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { buildCandidates, comboLabel } from '../engine/suggest'
import { newId } from '../lib/id'
import { formatKES } from '../lib/format'
import { cn } from '../lib/cn'

interface CreateVoteSheetProps {
  onClose: () => void
}

const SLOTS: { id: MealSlot; label: string; emoji: string }[] = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '☀️' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙' },
]

export function CreateVoteSheet({ onClose }: CreateVoteSheetProps) {
  const { data, currentMemberId, createVote } = useApp()
  const { setTab } = useNav()
  const [slot, setSlot] = useState<MealSlot>('dinner')
  const [title, setTitle] = useState('')
  const [candidates, setCandidates] = useState<ScoredCombo[]>(() =>
    buildCandidates(data, { budgetMode: data.settings.budget_mode, presentMemberIds: data.members.map((m) => m.id) }, 3),
  )

  const propose = () => {
    setCandidates(
      buildCandidates(
        data,
        {
          budgetMode: data.settings.budget_mode,
          presentMemberIds: data.members.map((m) => m.id),
        },
        3,
      ),
    )
  }

  const rerollOne = (index: number) => {
    const [fresh] = buildCandidates(
      data,
      {
        budgetMode: data.settings.budget_mode,
        presentMemberIds: data.members.map((m) => m.id),
      },
      1,
    )
    setCandidates((c) => c.map((x, i) => (i === index ? fresh : x)))
  }

  const removeOne = (index: number) => {
    setCandidates((c) => c.filter((_, i) => i !== index))
  }

  const addOne = () => {
    const [fresh] = buildCandidates(
      data,
      {
        budgetMode: data.settings.budget_mode,
        presentMemberIds: data.members.map((m) => m.id),
      },
      1,
    )
    if (fresh) setCandidates((c) => [...c, fresh])
  }

  const slotLabel = useMemo(() => SLOTS.find((s) => s.id === slot)?.label ?? '', [slot])

  const start = async () => {
    const valid = candidates.filter((c) => comboLabel(c))
    if (valid.length < 2) return
    const voteId = newId('vote')
    const vote: Vote = {
      id: voteId,
      title: title.trim() || `${slotLabel} vote`,
      slot,
      status: 'open',
      created_by: currentMemberId,
      winner_option_id: null,
      created_at: new Date().toISOString(),
    }
    const options: VoteOption[] = valid.slice(0, 4).map((c) => ({
      id: newId('opt'),
      vote_id: voteId,
      label: comboLabel(c),
      base_id: c.base?.id ?? null,
      protein_id: c.protein?.id ?? null,
      veg_id: c.veg?.id ?? null,
      total_cost: c.totalCost,
    }))
    await createVote(vote, options)
    onClose()
  }

  const canStart = candidates.filter((c) => comboLabel(c)).length >= 2

  // Escape hatch: build your own options in Foods instead of the suggestions.
  const pickInFoods = () => {
    onClose()
    setTab('foods')
  }

  return (
    <Sheet open onClose={onClose} title="Start a meal vote">
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

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`${slotLabel} vote`}
          className="w-full rounded-2xl bg-white px-4 py-3 font-display font-bold text-charcoal-900 shadow-card outline-none dark:bg-charcoal-800 dark:text-cream"
        />

        <div className="flex items-center justify-between">
          <p className="font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
            Candidates ({candidates.filter((c) => comboLabel(c)).length})
          </p>
          <button
            onClick={propose}
            className="flex items-center gap-1 rounded-full bg-mango-100 px-3 py-1 text-xs font-bold text-mango-700 dark:bg-mango-500/20"
          >
            <Wand2 size={13} /> Re-propose all
          </button>
        </div>

        <div className="space-y-2">
          {candidates.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-2xl bg-cream p-3 dark:bg-charcoal-950"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-bold text-charcoal-900 dark:text-cream">
                  {comboLabel(c) || 'Add more foods…'}
                </p>
                <p className="text-xs font-semibold text-charcoal-800/50 dark:text-cream/40">
                  {formatKES(c.totalCost)}
                </p>
              </div>
              <button
                onClick={() => rerollOne(i)}
                className="rounded-full p-2 text-charcoal-800/50 hover:bg-black/5 dark:text-cream/50"
                aria-label="Reroll"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => removeOne(i)}
                className="rounded-full p-2 text-charcoal-800/50 hover:bg-black/5 dark:text-cream/50"
                aria-label="Remove"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {candidates.length < 4 && (
          <Button variant="secondary" fullWidth onClick={addOne}>
            + Add another option
          </Button>
        )}

        {/* Prefer to choose specific dishes? Head to Foods. */}
        <button
          onClick={pickInFoods}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-charcoal-900/15 py-2.5 text-sm font-semibold text-charcoal-800/60 transition-colors hover:border-paprika-400 hover:text-paprika-600 dark:border-white/15 dark:text-cream/50"
        >
          <Utensils size={15} /> Don't like these? Pick your own in Foods
        </button>

        <Button fullWidth onClick={start} disabled={!canStart}>
          🗳️ Start voting
        </Button>
      </div>
    </Sheet>
  )
}
