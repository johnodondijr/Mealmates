import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Home, LogIn, Link2Off, Clock, X } from 'lucide-react'
import { Button } from './ui/Button'
import { cn } from './../lib/cn'
import { newId } from '../lib/id'
import { supabase, setHouseholdId, setLocalOnly } from '../data/supabaseClient'
import { createHousehold, requestToJoin, getJoinRequest } from '../data/household'

const AVATARS = [
  '🙂', '🦁', '🌸', '🚀', '🦋', '🐯', '🦊', '🐼', '🦉', '🐙',
  '🌵', '🍄', '⚡', '🌟', '🎸', '🎮', '🏀', '🍕', '🥑', '🦄',
]
const COLORS = [
  '#C4704F', '#C79A3E', '#6B8E5A', '#9A6E8A', '#4E8478', '#6E7FA3', '#B5714E', '#8A8577',
]

const CURRENT_MEMBER_KEY = 'mealmates.currentMember'
const PENDING_KEY = 'mealmates.pendingRequest'

interface Pending {
  requestId: string
  householdName: string
}
function readPending(): Pending | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as Pending) : null
  } catch {
    return null
  }
}

// Prefill the person's profile from any local (device-only) data they had
// before connecting, so switching to sync feels continuous.
function readLocalProfile(): { name: string; emoji: string; color: string } | null {
  try {
    const d = JSON.parse(localStorage.getItem('mealmates.data.v2') || 'null')
    const cur = localStorage.getItem(CURRENT_MEMBER_KEY)
    const m =
      d?.members?.find((x: { id: string }) => x.id === cur) ?? d?.members?.[0]
    if (m) return { name: m.name === 'Me' ? '' : m.name, emoji: m.emoji, color: m.color }
  } catch {
    /* ignore */
  }
  return null
}

export function HouseholdGate() {
  const local = readLocalProfile()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState(local?.name ?? '')
  const [emoji, setEmoji] = useState(local?.emoji ?? '🙂')
  const [color, setColor] = useState(local?.color ?? COLORS[0])
  const [household, setHousehold] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(() => readPending())

  const member = () => ({ id: newId('member'), name: name.trim(), emoji, color })

  const finish = (householdId: string, memberId: string) => {
    setHouseholdId(householdId)
    localStorage.setItem(CURRENT_MEMBER_KEY, memberId)
    localStorage.removeItem(PENDING_KEY)
    window.location.reload()
  }

  // While a join request is pending, poll it until the admin approves or denies.
  useEffect(() => {
    if (!pending || !supabase) return
    let active = true
    const tick = async () => {
      const req = await getJoinRequest(supabase!, pending.requestId)
      if (!active) return
      if (!req || req.status === 'denied') {
        localStorage.removeItem(PENDING_KEY)
        setPending(null)
        setBusy(false)
        setError(
          req ? 'Your request was declined.' : 'That request is no longer available.',
        )
      } else if (req.status === 'approved' && req.member_id) {
        finish(req.household_id, req.member_id)
      }
    }
    tick()
    const iv = setInterval(tick, 3000)
    return () => {
      active = false
      clearInterval(iv)
    }
  }, [pending])

  const submit = async () => {
    if (!supabase) return
    if (!name.trim()) {
      setError('Add your name first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (mode === 'create') {
        const { household: hh, memberId } = await createHousehold(supabase, {
          name: household.trim() || 'Our Household',
          monthly_budget: 30000,
          budget_mode: false,
          member: member(),
        })
        finish(hh.id, memberId)
      } else {
        if (!code.trim()) {
          setError('Enter the household code.')
          setBusy(false)
          return
        }
        const res = await requestToJoin(supabase, code, member())
        if (!res) {
          setError("No household with that code — double-check it with whoever set it up.")
          setBusy(false)
          return
        }
        const p = { requestId: res.request.id, householdName: res.householdName }
        localStorage.setItem(PENDING_KEY, JSON.stringify(p))
        setPending(p)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong — try again.')
      setBusy(false)
    }
  }

  const cancelPending = () => {
    localStorage.removeItem(PENDING_KEY)
    setPending(null)
    setBusy(false)
    setError(null)
  }

  const useLocalOnly = () => {
    setLocalOnly(true)
    window.location.reload()
  }

  if (pending) {
    return (
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-cream px-6 dark:bg-charcoal-950"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-mango-400 text-5xl shadow-pop">
            <Clock size={40} strokeWidth={2.4} className="text-charcoal-900" />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-charcoal-900 dark:text-cream">
            Waiting to be let in
          </h1>
          <p className="mt-2 text-charcoal-800/55 dark:text-cream/45">
            Your request to join <b>{pending.householdName}</b> was sent. The admin needs to
            approve it — this'll update the moment they do.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-charcoal-800/50 dark:text-cream/40">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-semibold">Waiting for approval…</span>
          </div>
          <button
            onClick={cancelPending}
            className="mt-8 inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-charcoal-800/45 dark:text-cream/40"
          >
            <X size={15} /> Cancel request
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="fixed inset-0 z-[70] overflow-y-auto bg-cream dark:bg-charcoal-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-paprika-500 text-5xl shadow-pop">
            🏡
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-charcoal-900 dark:text-cream">
            Your household
          </h1>
          <p className="mt-2 text-charcoal-800/55 dark:text-cream/45">
            Start a household and share the code, or join one you were given.
          </p>
        </div>

        {/* Create / Join toggle */}
        <div className="mb-5 flex gap-1 rounded-2xl bg-charcoal-900/[0.05] p-1 dark:bg-white/[0.06]">
          {(
            [
              { id: 'create', label: 'Start one', icon: <Home size={16} /> },
              { id: 'join', label: 'Join one', icon: <LogIn size={16} /> },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id)
                setError(null)
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 font-display text-sm font-bold transition-colors',
                mode === m.id
                  ? 'bg-white text-charcoal-900 shadow-card dark:bg-charcoal-800 dark:text-cream'
                  : 'text-charcoal-800/55 dark:text-cream/50',
              )}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Your profile */}
        <Label>You</Label>
        <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-card dark:bg-charcoal-800">
          <button
            onClick={() => setEmoji(AVATARS[(AVATARS.indexOf(emoji) + 1) % AVATARS.length])}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: color + '26', border: `2px solid ${color}` }}
            aria-label="Change avatar"
          >
            {emoji}
          </button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="min-w-0 flex-1 bg-transparent font-display font-bold text-charcoal-900 outline-none placeholder:text-charcoal-800/35 dark:text-cream dark:placeholder:text-cream/35"
          />
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                'h-7 w-7 rounded-full transition-transform active:scale-90',
                color === c &&
                  'ring-2 ring-offset-2 ring-charcoal-900 dark:ring-cream dark:ring-offset-charcoal-950',
              )}
              style={{ backgroundColor: c }}
              aria-label={`Colour ${c}`}
            />
          ))}
        </div>

        {mode === 'create' ? (
          <>
            <Label>Household name</Label>
            <input
              value={household}
              onChange={(e) => setHousehold(e.target.value)}
              placeholder="e.g. The Odondis"
              className="w-full rounded-2xl bg-white px-4 py-3.5 font-display text-lg font-bold text-charcoal-900 shadow-card outline-none ring-paprika-300 focus:ring-2 dark:bg-charcoal-800 dark:text-cream"
            />
          </>
        ) : (
          <>
            <Label>Household code</Label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={8}
              className="w-full rounded-2xl bg-white px-4 py-3.5 text-center font-display text-2xl font-extrabold tracking-[0.3em] text-charcoal-900 shadow-card outline-none ring-paprika-300 focus:ring-2 dark:bg-charcoal-800 dark:text-cream"
            />
          </>
        )}

        {error && (
          <p className="mt-3 px-1 text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-auto pt-8">
          <Button fullWidth size="lg" onClick={submit} disabled={busy}>
            {busy ? (
              <Loader2 size={20} className="animate-spin" />
            ) : mode === 'create' ? (
              <Home size={20} />
            ) : (
              <LogIn size={20} />
            )}
            {busy
              ? mode === 'create'
                ? 'Creating…'
                : 'Requesting…'
              : mode === 'create'
                ? 'Create household'
                : 'Ask to join'}
          </Button>
          <button
            onClick={useLocalOnly}
            className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-sm font-semibold text-charcoal-800/45 dark:text-cream/40"
          >
            <Link2Off size={14} /> Use this device only (no sync)
          </button>
        </div>
      </div>
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
