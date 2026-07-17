import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, PartyPopper, Trophy, Users } from 'lucide-react'
import { useApp, mealFromCombo } from '../store/AppContext'
import type { MealCost, Vote, VoteOption } from '../types'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Avatar } from './ui/Avatar'
import { Confetti } from './Confetti'
import { TieBreaker } from './TieBreaker'
import { MealCostSheet } from './MealCostSheet'
import { foodAvgCost } from '../engine/stats'
import { formatKES } from '../lib/format'
import { cn } from '../lib/cn'

interface VoteCardProps {
  vote: Vote
}

const SLOT_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
}

export function VoteCard({ vote }: VoteCardProps) {
  const { data, currentMemberId, currentMember, castBallot, closeVote, logMeal, updateMeal } =
    useApp()
  const [confetti, setConfetti] = useState(false)
  const [breaking, setBreaking] = useState(false)
  const [costOpen, setCostOpen] = useState(false)

  const options = useMemo(
    () => data.voteOptions.filter((o) => o.vote_id === vote.id),
    [data.voteOptions, vote.id],
  )
  const ballots = useMemo(
    () => data.ballots.filter((b) => b.vote_id === vote.id),
    [data.ballots, vote.id],
  )

  const countFor = (optId: string) => ballots.filter((b) => b.option_id === optId).length
  const votersFor = (optId: string) =>
    ballots
      .filter((b) => b.option_id === optId)
      .map((b) => data.members.find((m) => m.id === b.member_id))
      .filter(Boolean)

  const myBallot = ballots.find((b) => b.member_id === currentMemberId)
  const totalVotes = ballots.length
  const maxCount = Math.max(1, ...options.map((o) => countFor(o.id)))

  const leaders = useMemo(() => {
    const top = Math.max(0, ...options.map((o) => countFor(o.id)))
    return options.filter((o) => countFor(o.id) === top && top > 0)
  }, [options, ballots]) // eslint-disable-line react-hooks/exhaustive-deps

  const isClosed = vote.status === 'closed'
  const winner = options.find((o) => o.id === vote.winner_option_id)
  const loggedMeal = data.meals.find((m) => m.from_vote_id === vote.id)

  // Itemised cost lines for an option, seeded from each food's average/estimate.
  const costItemsFor = (option: VoteOption) =>
    ([option.base_id, option.protein_id, option.veg_id].filter(Boolean) as string[])
      .map((id) => data.foods.find((f) => f.id === id))
      .filter((f): f is NonNullable<typeof f> => !!f)
      .map((f) => ({
        food_id: f.id,
        label: f.name,
        suggested: foodAvgCost(data, f.id) ?? f.cost,
      }))

  const finish = async (option: VoteOption) => {
    await closeVote(vote.id, option.id)
    // Seed itemised costs from estimates; the household can adjust to actuals.
    const seeded: MealCost[] = costItemsFor(option).map((it) => ({
      food_id: it.food_id,
      label: it.label,
      amount: it.suggested,
    }))
    await logMeal(
      mealFromCombo(
        option.label,
        vote.slot,
        {
          base_id: option.base_id,
          protein_id: option.protein_id,
          veg_id: option.veg_id,
        },
        option.total_cost,
        currentMemberId,
        vote.id,
        seeded,
      ),
    )
    setConfetti(true)
  }

  const adjustCost = async (costs: MealCost[]) => {
    if (!loggedMeal) return
    await updateMeal({
      ...loggedMeal,
      component_costs: costs,
      cost: costs.reduce((s, c) => s + c.amount, 0),
    })
    setCostOpen(false)
    setConfetti(true)
  }

  const declareWinner = async () => {
    if (leaders.length === 1) {
      await finish(leaders[0])
    } else if (leaders.length > 1) {
      setBreaking(true)
    }
  }

  return (
    <Card className={cn('overflow-hidden p-4', isClosed && 'opacity-95')}>
      <Confetti fire={confetti} onDone={() => setConfetti(false)} />

      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-extrabold text-charcoal-900 dark:text-cream">
            {SLOT_EMOJI[vote.slot]} {vote.title}
          </p>
          <p className="flex items-center gap-1 text-xs font-semibold text-charcoal-800/50 dark:text-cream/40">
            <Users size={12} /> {totalVotes}/{data.members.length} voted
          </p>
        </div>
        {isClosed && (
          <span className="flex items-center gap-1 rounded-full bg-mango-100 px-2.5 py-1 text-xs font-bold text-mango-700 dark:bg-mango-500/20">
            <Trophy size={13} /> Decided
          </span>
        )}
      </div>

      <div className="space-y-2">
        {options.map((o) => {
          const count = countFor(o.id)
          const pct = totalVotes ? (count / totalVotes) * 100 : 0
          const mine = myBallot?.option_id === o.id
          const isWinner = winner?.id === o.id
          const isLeading = !isClosed && count === maxCount && count > 0
          return (
            <button
              key={o.id}
              disabled={isClosed}
              onClick={() => !isClosed && castBallot(vote.id, o.id)}
              className={cn(
                'relative w-full overflow-hidden rounded-2xl border-2 p-3 text-left transition-colors',
                isWinner
                  ? 'border-mango-400 bg-mango-50 dark:bg-mango-500/10'
                  : mine
                    ? 'border-paprika-400 bg-paprika-50 dark:bg-paprika-500/10'
                    : 'border-transparent bg-cream dark:bg-charcoal-950',
              )}
            >
              {/* animated result bar */}
              <motion.div
                className={cn(
                  'absolute inset-y-0 left-0 -z-0',
                  isWinner
                    ? 'bg-mango-200/60 dark:bg-mango-500/20'
                    : 'bg-paprika-100/70 dark:bg-paprika-500/15',
                )}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
              <div className="relative z-10 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold text-charcoal-900 dark:text-cream">
                    {o.label}
                  </p>
                  <p className="text-xs font-semibold text-charcoal-800/50 dark:text-cream/40">
                    {formatKES(o.total_cost)}
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {votersFor(o.id).map(
                    (m) => m && <Avatar key={m.id} member={m} size={24} ring />,
                  )}
                </div>
                <span
                  className={cn(
                    'ml-1 min-w-[1.5rem] text-right font-display text-lg font-extrabold',
                    isLeading || isWinner
                      ? 'text-paprika-600 dark:text-paprika-300'
                      : 'text-charcoal-800/40 dark:text-cream/40',
                  )}
                >
                  {count}
                </span>
                {mine && !isClosed && <Check size={16} className="text-paprika-500" />}
              </div>
            </button>
          )
        })}
      </div>

      {!isClosed && (
        <div className="mt-3">
          <Button
            fullWidth
            variant={totalVotes > 0 ? 'primary' : 'secondary'}
            disabled={totalVotes === 0}
            onClick={declareWinner}
          >
            <PartyPopper size={18} />
            {leaders.length > 1 ? 'Tie! Break it 🎡' : 'Close vote & declare winner'}
          </Button>
          <p className="mt-1.5 text-center text-xs font-semibold text-charcoal-800/40 dark:text-cream/40">
            Voting as {currentMember?.name} · tap an option to vote
          </p>
        </div>
      )}

      {isClosed && winner && (
        <div className="mt-3 rounded-2xl bg-mango-100 p-3 text-center dark:bg-mango-500/15">
          <p className="font-display font-bold text-mango-800 dark:text-mango-200">
            🏆 We're having {winner.label}!
          </p>
          {loggedMeal && (
            <button
              onClick={() => setCostOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-mango-800 dark:bg-charcoal-900/50 dark:text-mango-200"
            >
              🍳 Enter actual cost · {formatKES(loggedMeal.cost)}
            </button>
          )}
        </div>
      )}

      {costOpen && winner && (
        <MealCostSheet
          title="What did it cost? 🍳"
          items={costItemsFor(winner).map((it) => {
            const existing = loggedMeal?.component_costs?.find(
              (c) => c.food_id === it.food_id,
            )
            return existing ? { ...it, suggested: existing.amount } : it
          })}
          confirmLabel="Save costs ✅"
          onClose={() => setCostOpen(false)}
          onConfirm={adjustCost}
        />
      )}

      <AnimatePresence>
        {breaking && (
          <TieBreaker
            options={leaders}
            onClose={() => setBreaking(false)}
            onResult={async (opt) => {
              setBreaking(false)
              await finish(opt)
            }}
          />
        )}
      </AnimatePresence>
    </Card>
  )
}
