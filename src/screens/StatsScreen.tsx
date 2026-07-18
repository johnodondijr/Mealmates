import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Share2, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { CountUp } from '../components/ui/CountUp'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { LogMealSheet } from '../components/LogMealSheet'
import {
  buildWrapped,
  foodFrequency,
  heatmap,
  mostEatenCombos,
} from '../engine/stats'
import { shareWrapped } from '../lib/shareWrapped'
import { formatKES, relativeDay } from '../lib/format'
import { cn } from '../lib/cn'

export function StatsScreen() {
  const { data, removeMeal } = useApp()
  const [logging, setLogging] = useState(false)

  const combos = useMemo(() => mostEatenCombos(data, 'month'), [data])
  const freq = useMemo(() => foodFrequency(data), [data])
  const cells = useMemo(() => heatmap(data, 28), [data])
  const wrapped = useMemo(() => buildWrapped(data), [data])
  const nameById = useMemo(
    () => new Map(data.members.map((m) => [m.id, m])),
    [data.members],
  )
  const history = useMemo(
    () => [...data.meals].sort((a, b) => b.eaten_on.localeCompare(a.eaten_on)),
    [data.meals],
  )

  const maxCombo = Math.max(1, ...combos.map((c) => c.count))

  return (
    <div className="px-4 pb-4">
      <ScreenHeader title="History" subtitle="What the house has been eating." />

      {/* Wrapped card */}
      <Card className="mt-4 overflow-hidden">
        <div className="relative bg-gradient-to-b from-paprika-500 to-paprika-700 p-5 text-white">
          {/* soft warm highlight, not a rainbow */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-40 blur-2xl"
            style={{ background: 'radial-gradient(circle, #F6C043 0%, transparent 70%)' }}
          />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                Household Wrapped
              </p>
              <p className="mt-0.5 font-display text-2xl font-extrabold tracking-[-0.01em]">
                {wrapped.monthLabel}
              </p>
            </div>
            <span className="text-3xl opacity-90">🎉</span>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-2.5">
            <WrapTile emoji="🏆" label="Top meal" value={wrapped.topMeal?.label ?? '—'} />
            <WrapTile emoji="💸" label="Total spent" value={formatKES(wrapped.totalSpent)} />
            <WrapTile
              emoji="👑"
              label="Chef's fav"
              value={wrapped.chefFavorite?.name ?? '—'}
            />
            <WrapTile
              emoji="🤑"
              label="Big spender"
              value={wrapped.biggestSpender?.name ?? '—'}
            />
            <WrapTile emoji="🚫" label="Most refused" value={wrapped.mostRefused?.name ?? '—'} />
            <WrapTile emoji="🍽️" label="Meals logged" value={String(wrapped.mealsLogged)} />
          </div>

          <button
            onClick={() => shareWrapped(wrapped, data.settings.household_name)}
            className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 font-display font-bold text-paprika-600 shadow-sm transition-transform active:scale-[0.98]"
          >
            <Share2 size={18} /> Share to WhatsApp
          </button>
        </div>
      </Card>

      {/* Most eaten combos — open on the canvas */}
      <SectionLabel>Most eaten this month</SectionLabel>
      {combos.length > 0 ? (
        <div className="space-y-3.5 px-1">
          {combos.slice(0, 6).map((c) => (
            <div key={c.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-display text-sm font-bold text-charcoal-900 dark:text-cream">
                  {c.emojis} {c.label}
                </span>
                <span className="font-display text-sm font-extrabold text-paprika-600 dark:text-paprika-300">
                  ×{c.count}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-charcoal-900/[0.06] dark:bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-paprika-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.count / maxCombo) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyBlurb emoji="🍜" text="No meals logged this month yet." />
      )}

      {/* Heatmap — open on the canvas */}
      <SectionLabel>Last 4 weeks</SectionLabel>
      <div className="px-1">
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell) => (
            <div
              key={cell.date}
              title={cell.meal ? `${cell.date}: ${cell.meal.label}` : cell.date}
              className={cn(
                'flex aspect-square items-center justify-center rounded-xl text-base',
                cell.meal
                  ? 'bg-avocado-100 dark:bg-avocado-500/20'
                  : 'bg-charcoal-900/[0.05] dark:bg-white/[0.05]',
              )}
            >
              {cell.emojis ? cell.emojis.slice(0, 2) : ''}
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-center text-xs font-medium text-charcoal-800/40 dark:text-cream/40">
          Each square is a day · emoji = what you ate
        </p>
      </div>

      {/* Frequent foods — open chips */}
      {freq.length > 0 && (
        <>
          <SectionLabel>Frequent foods</SectionLabel>
          <div className="flex flex-wrap gap-2 px-1">
            {freq.slice(0, 10).map((f) => (
              <div
                key={f.food.id}
                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-charcoal-900/[0.05] dark:bg-charcoal-800 dark:ring-white/[0.06]"
              >
                <span>{f.food.emoji}</span>
                <span className="font-display text-xs font-bold text-charcoal-900 dark:text-cream">
                  {f.food.name}
                </span>
                <span className="text-xs font-bold text-charcoal-800/40 dark:text-cream/40">
                  ×{f.count}
                  {f.daysSinceLast !== null && ` · ${f.daysSinceLast}d`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Log + history */}
      <div className="mt-5">
        <Button fullWidth onClick={() => setLogging(true)}>
          <Plus size={20} /> Log a meal we ate
        </Button>
      </div>

      <SectionLabel>Meal history</SectionLabel>
      {history.length > 0 ? (
        <Card flat className="divide-y divide-charcoal-900/[0.05] overflow-hidden dark:divide-white/[0.06]">
          {history.map((m) => {
            const who = nameById.get(m.logged_by)
            return (
              <div key={m.id} className="flex items-center gap-3 p-3">
                {who && <Avatar member={who} size={30} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold text-charcoal-900 dark:text-cream">
                    {m.label}
                  </p>
                  <p className="text-xs font-medium text-charcoal-800/50 dark:text-cream/40">
                    {relativeDay(m.eaten_on)} · {m.slot} · {formatKES(m.cost)}
                  </p>
                </div>
                <button
                  onClick={() => removeMeal(m.id)}
                  className="rounded-full p-1.5 text-charcoal-800/30 hover:bg-black/5 hover:text-red-500 dark:text-cream/30"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </Card>
      ) : (
        <EmptyBlurb emoji="👀" text="No meals logged yet. Someone's been eating out." />
      )}

      {/* count-up flourish */}
      <div className="mt-6 text-center">
        <p className="font-display text-xs font-bold uppercase tracking-widest text-charcoal-800/40 dark:text-cream/40">
          Meals logged all-time
        </p>
        <p className="font-display text-4xl font-extrabold text-paprika-500">
          <CountUp value={data.meals.length} />
        </p>
      </div>

      {logging && <LogMealSheet onClose={() => setLogging(false)} />}
    </div>
  )
}

function WrapTile({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
      <p className="text-2xl">{emoji}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/70">
        {label}
      </p>
      <p className="truncate font-display text-sm font-extrabold">{value}</p>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 mt-7 px-1 font-display text-[0.8rem] font-bold uppercase tracking-wide text-charcoal-800/45 dark:text-cream/40">
      {children}
    </h3>
  )
}

function EmptyBlurb({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-4xl">{emoji}</p>
      <p className="mt-2 font-display font-bold text-charcoal-800/60 dark:text-cream/50">
        {text}
      </p>
    </div>
  )
}
