import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { Member } from '../types'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'
import { DIET_OPTIONS } from '../lib/diet'

interface MemberEditorProps {
  member: Member | null // null = new
  onClose: () => void
  makeId: () => string
}

const AVATAR_EMOJIS = [
  '🦁','🌸','🚀','🦋','🐯','🐨','🦊','🐼','🦉','🐙','🌵','🍄','⚡','🌟',
  '🎸','🎮','🏀','🍕','🥑','🦄','🐸','🐧','🦖','🌮',
]

const COLORS = [
  '#C4704F','#C79A3E','#6B8E5A','#9A6E8A','#4E8478','#6E7FA3','#B5714E','#8A8577',
]

export function MemberEditor({ member, onClose, makeId }: MemberEditorProps) {
  const { saveMember } = useApp()
  const [name, setName] = useState(member?.name ?? '')
  const [emoji, setEmoji] = useState(member?.emoji ?? '🦁')
  const [color, setColor] = useState(member?.color ?? COLORS[0])
  const [diet, setDiet] = useState<string[]>(member?.diet ?? [])

  const toggleDiet = (id: string) =>
    setDiet((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))

  const save = async () => {
    if (!name.trim()) return
    await saveMember({
      id: member?.id ?? makeId(),
      name: name.trim(),
      emoji,
      color,
      diet,
      created_at: member?.created_at ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={member ? 'Edit housemate' : 'Add housemate'}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-4xl"
            style={{ backgroundColor: color + '30', border: `2px solid ${color}` }}
          >
            {emoji}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            autoFocus
            className="flex-1 rounded-2xl bg-white px-4 py-3 font-display text-lg font-bold text-charcoal-900 shadow-card outline-none ring-paprika-300 focus:ring-2 dark:bg-charcoal-800 dark:text-cream"
          />
        </div>

        <div>
          <p className="mb-1.5 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
            Avatar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {AVATAR_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-transform active:scale-90',
                  emoji === e
                    ? 'bg-paprika-100 ring-2 ring-paprika-400 dark:bg-paprika-500/20'
                    : 'bg-white dark:bg-charcoal-800',
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
            Color
          </p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'h-9 w-9 rounded-full transition-transform active:scale-90',
                  color === c && 'ring-2 ring-offset-2 ring-charcoal-900 dark:ring-cream dark:ring-offset-charcoal-900',
                )}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 font-display text-xs font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
            Diet (never suggest these)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DIET_OPTIONS.map((d) => {
              const on = diet.includes(d.id)
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDiet(d.id)}
                  aria-pressed={on}
                  className={cn(
                    'rounded-full px-3 py-1.5 font-display text-sm font-bold transition-colors',
                    on
                      ? 'bg-paprika-500 text-white shadow-pop'
                      : 'bg-white text-charcoal-800 ring-1 ring-charcoal-900/[0.06] dark:bg-charcoal-800 dark:text-cream dark:ring-white/[0.08]',
                  )}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>

        <Button fullWidth onClick={save} disabled={!name.trim()}>
          {member ? 'Save changes' : 'Add housemate'}
        </Button>
      </div>
    </Sheet>
  )
}
