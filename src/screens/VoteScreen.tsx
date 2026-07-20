import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Plus, Trophy } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { VoteCard } from '../components/VoteCard'
import { CreateVoteSheet } from '../components/CreateVoteSheet'
import { chefWinCounts, chefFavoriteId } from '../engine/stats'

export function VoteScreen() {
  const { data } = useApp()
  const [creating, setCreating] = useState(false)

  const votes = useMemo(
    () => [...data.votes].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [data.votes],
  )
  const open = votes.filter((v) => v.status === 'open')
  const closed = votes.filter((v) => v.status === 'closed')

  return (
    <div className="px-4 pb-4">
      <ScreenHeader
        title="Meal Votes"
        subtitle="Pass the phone or vote on your own device — live."
      />

      <Leaderboard />

      <div className="mt-4">
        <Button fullWidth onClick={() => setCreating(true)}>
          <Plus size={20} /> Start a meal vote
        </Button>
      </div>

      {/* Open votes */}
      <div className="mt-4 space-y-3">
        {open.map((v) => (
          <VoteCard key={v.id} vote={v} />
        ))}
      </div>

      {open.length === 0 && closed.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-5xl">🗳️</p>
          <p className="mt-2 font-display font-bold text-charcoal-800/60 dark:text-cream/50">
            No votes yet. Someone start one!
          </p>
          <p className="mx-auto mt-1 max-w-[16rem] text-xs font-medium text-charcoal-800/45 dark:text-cream/40">
            Tap <b>Start a meal vote</b> above to put a few options to the house.
          </p>
        </div>
      )}

      {/* Recent results */}
      {closed.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
            Recent results
          </h3>
          <div className="space-y-3">
            {closed.slice(0, 5).map((v) => (
              <VoteCard key={v.id} vote={v} />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {creating && <CreateVoteSheet onClose={() => setCreating(false)} />}
      </AnimatePresence>
    </div>
  )
}

function Leaderboard() {
  const { data } = useApp()
  const wins = chefWinCounts(data)
  const chefId = chefFavoriteId(data)

  const rows = useMemo(
    () =>
      data.members
        .map((m) => ({ member: m, wins: wins.get(m.id) ?? 0 }))
        .sort((a, b) => b.wins - a.wins),
    [data.members, wins],
  )

  const maxWins = Math.max(1, ...rows.map((r) => r.wins))

  return (
    <Card className="mt-3 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Trophy size={18} className="text-mango-500" />
        <h3 className="font-display font-extrabold text-charcoal-900 dark:text-cream">
          Chef's Favorite Leaderboard
        </h3>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.member.id} className="flex items-center gap-3">
            <Avatar member={r.member} size={32} crown={chefId === r.member.id} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-charcoal-900 dark:text-cream">
                  {r.member.name}
                  {chefId === r.member.id && (
                    <Crown size={14} className="ml-1 inline text-mango-500" />
                  )}
                </span>
                <span className="text-xs font-bold text-charcoal-800/50 dark:text-cream/40">
                  {r.wins} win{r.wins === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-charcoal-50 dark:bg-charcoal-950">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: r.member.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(r.wins / maxWins) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
