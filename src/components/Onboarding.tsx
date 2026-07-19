import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Plus, X, Check } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'
import { newId } from '../lib/id'

// A short, playful first-run setup: name the household, add who's eating, and
// optionally set a food budget. Everything here is editable later in Settings.

const AVATARS = [
  '🙂', '🦁', '🌸', '🚀', '🦋', '🐯', '🦊', '🐼', '🦉', '🐙',
  '🌵', '🍄', '⚡', '🌟', '🎸', '🎮', '🏀', '🍕', '🥑', '🦄',
]
const COLORS = [
  '#C4704F', '#C79A3E', '#6B8E5A', '#9A6E8A', '#4E8478', '#6E7FA3', '#B5714E', '#8A8577',
]

interface Draft {
  id: string
  name: string
  emoji: string
  color: string
  created_at: string
}

interface OnboardingProps {
  onDone: () => void
}

export function Onboarding({ onDone }: OnboardingProps) {
  const { data, saveMember, removeMember, updateSettings } = useApp()
  const [step, setStep] = useState(0)

  const [household, setHousehold] = useState(
    data.settings.household_name === 'My Household' ? '' : data.settings.household_name,
  )
  const [people, setPeople] = useState<Draft[]>(() =>
    data.members.length > 0
      ? data.members.map((m) => ({
          id: m.id,
          name: m.name === 'Me' ? '' : m.name,
          emoji: m.emoji,
          color: m.color,
          created_at: m.created_at,
        }))
      : [{ id: 'member_1', name: '', emoji: '🙂', color: COLORS[0], created_at: new Date().toISOString() }],
  )
  const [trackBudget, setTrackBudget] = useState(data.settings.budget_mode)
  const [budget, setBudget] = useState(String(data.settings.monthly_budget || 30000))
  const [saving, setSaving] = useState(false)

  const addPerson = () => {
    const i = people.length
    setPeople((p) => [
      ...p,
      {
        id: newId('member'),
        name: '',
        emoji: AVATARS[(i * 3 + 1) % AVATARS.length],
        color: COLORS[i % COLORS.length],
        created_at: new Date().toISOString(),
      },
    ])
  }
  const updatePerson = (id: string, patch: Partial<Draft>) =>
    setPeople((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  const removePerson = (id: string) => setPeople((p) => p.filter((d) => d.id !== id))

  const namedPeople = people.filter((d) => d.name.trim())

  const finish = async () => {
    setSaving(true)
    // Reconcile members: save everyone with a name, drop the rest.
    const keep = namedPeople.length
      ? namedPeople
      : [{ ...people[0], name: 'Me' }] // never leave the household empty
    const keepIds = new Set(keep.map((d) => d.id))
    for (const d of keep) {
      await saveMember({
        id: d.id,
        name: d.name.trim() || 'Me',
        emoji: d.emoji,
        color: d.color,
        created_at: d.created_at,
      })
    }
    for (const m of data.members) {
      if (!keepIds.has(m.id)) await removeMember(m.id)
    }
    await updateSettings({
      ...data.settings,
      household_name: household.trim() || 'Our Household',
      budget_mode: trackBudget,
      monthly_budget: trackBudget ? Number(budget) || 0 : data.settings.monthly_budget,
    })
    localStorage.setItem('mealmates.onboarded', '1')
    onDone()
  }

  const skip = () => {
    localStorage.setItem('mealmates.onboarded', '1')
    onDone()
  }

  return (
    <motion.div
      className="fixed inset-0 z-[70] overflow-y-auto bg-cream dark:bg-charcoal-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === step ? 'w-6 bg-paprika-500' : 'w-1.5 bg-charcoal-900/15 dark:bg-white/15',
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <Panel key="welcome">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-paprika-500 text-5xl shadow-pop">
                  🍲
                </div>
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-charcoal-900 dark:text-cream">
                  Welcome to MealMates
                </h1>
                <p className="mt-2 text-charcoal-800/55 dark:text-cream/45">
                  Let's settle "what are we eating?" — set up your household in a few taps.
                </p>
              </div>
              <Label>What's your household called?</Label>
              <input
                value={household}
                onChange={(e) => setHousehold(e.target.value)}
                placeholder="e.g. The Odondis"
                autoFocus
                className="w-full rounded-2xl bg-white px-4 py-3.5 font-display text-lg font-bold text-charcoal-900 shadow-card outline-none ring-paprika-300 focus:ring-2 dark:bg-charcoal-800 dark:text-cream"
              />
              <div className="mt-auto pt-8">
                <Button fullWidth size="lg" onClick={() => setStep(1)}>
                  Continue <ArrowRight size={20} />
                </Button>
                <button
                  onClick={skip}
                  className="mt-3 w-full py-2 text-sm font-semibold text-charcoal-800/45 dark:text-cream/40"
                >
                  Skip for now
                </button>
              </div>
            </Panel>
          )}

          {step === 1 && (
            <Panel key="people">
              <div className="mb-5">
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-charcoal-900 dark:text-cream">
                  Who's at the table?
                </h1>
                <p className="mt-2 text-charcoal-800/55 dark:text-cream/45">
                  Add everyone who eats here — they'll show up in votes and the spending split.
                </p>
              </div>

              <div className="space-y-2.5">
                {people.map((d, idx) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-card dark:bg-charcoal-800"
                  >
                    <button
                      onClick={() => {
                        const cur = AVATARS.indexOf(d.emoji)
                        updatePerson(d.id, { emoji: AVATARS[(cur + 1) % AVATARS.length] })
                      }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                      style={{ backgroundColor: d.color + '26', border: `2px solid ${d.color}` }}
                      aria-label="Change avatar"
                    >
                      {d.emoji}
                    </button>
                    <input
                      value={d.name}
                      onChange={(e) => updatePerson(d.id, { name: e.target.value })}
                      placeholder={idx === 0 ? 'Your name' : 'Housemate name'}
                      autoFocus={idx === 0}
                      className="min-w-0 flex-1 bg-transparent font-display font-bold text-charcoal-900 outline-none placeholder:text-charcoal-800/35 dark:text-cream dark:placeholder:text-cream/35"
                    />
                    {people.length > 1 && (
                      <button
                        onClick={() => removePerson(d.id)}
                        className="rounded-full p-2 text-charcoal-800/35 hover:text-red-500 dark:text-cream/35"
                        aria-label="Remove"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addPerson}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-charcoal-900/15 py-3 font-display text-sm font-bold text-charcoal-800/55 transition-colors hover:border-paprika-400 hover:text-paprika-600 dark:border-white/15 dark:text-cream/45"
              >
                <Plus size={18} /> Add housemate
              </button>
              <p className="mt-2 text-xs text-charcoal-800/40 dark:text-cream/35">
                Tap an avatar to change it. Just you? One is fine.
              </p>

              <div className="mt-auto flex gap-2 pt-8">
                <Button variant="secondary" onClick={() => setStep(0)} className="px-5">
                  Back
                </Button>
                <Button fullWidth size="lg" onClick={() => setStep(2)}>
                  Continue <ArrowRight size={20} />
                </Button>
              </div>
            </Panel>
          )}

          {step === 2 && (
            <Panel key="budget">
              <div className="mb-5">
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-charcoal-900 dark:text-cream">
                  Watch the food budget?
                </h1>
                <p className="mt-2 text-charcoal-800/55 dark:text-cream/45">
                  Optional — set a monthly cap and MealMates will lean toward cheaper meals as
                  you get close.
                </p>
              </div>

              <button
                onClick={() => setTrackBudget((v) => !v)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-card dark:bg-charcoal-800"
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors',
                    trackBudget
                      ? 'border-paprika-500 bg-paprika-500 text-white'
                      : 'border-charcoal-900/20 dark:border-white/20',
                  )}
                >
                  {trackBudget && <Check size={17} strokeWidth={3} />}
                </span>
                <span className="flex-1 font-display font-bold text-charcoal-900 dark:text-cream">
                  Track a monthly budget
                </span>
              </button>

              <AnimatePresence>
                {trackBudget && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3">
                      <Label>Monthly food budget (KES)</Label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full rounded-2xl bg-white px-4 py-3.5 font-display text-lg font-bold text-charcoal-900 shadow-card outline-none ring-paprika-300 focus:ring-2 dark:bg-charcoal-800 dark:text-cream"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-auto flex gap-2 pt-8">
                <Button variant="secondary" onClick={() => setStep(1)} className="px-5">
                  Back
                </Button>
                <Button fullWidth size="lg" onClick={finish} disabled={saving}>
                  {saving ? 'Setting up…' : "Let's eat 🍽️"}
                </Button>
              </div>
            </Panel>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="flex flex-1 flex-col"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
      {children}
    </label>
  )
}
