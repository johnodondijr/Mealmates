import { useState } from 'react'
import { Database, HardDrive, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { Member } from '../types'
import { Sheet } from '../components/ui/Sheet'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { MemberEditor } from '../components/MemberEditor'
import { SyncSettings } from '../components/SyncSettings'
import { newId } from '../lib/id'

interface SettingsScreenProps {
  onClose: () => void
}

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const { data, usingSupabase, updateSettings, removeMember } = useApp()
  const [editing, setEditing] = useState<Member | null | undefined>(undefined)
  const [household, setHousehold] = useState(data.settings.household_name)
  const [budget, setBudget] = useState(String(data.settings.monthly_budget))

  const saveHousehold = () => {
    updateSettings({
      ...data.settings,
      household_name: household.trim() || 'Our Household',
      monthly_budget: Number(budget) || 0,
    })
  }

  return (
    <Sheet open onClose={onClose} title="Settings">
      <div className="space-y-6">
        {/* Household */}
        <section>
          <SectionTitle>Household</SectionTitle>
          <label className="mb-1 block text-xs font-bold text-charcoal-800/50 dark:text-cream/40">
            Household name
          </label>
          <input
            value={household}
            onChange={(e) => setHousehold(e.target.value)}
            onBlur={saveHousehold}
            className="mb-3 w-full rounded-2xl bg-white px-4 py-3 font-display font-bold text-charcoal-900 shadow-card outline-none dark:bg-charcoal-800 dark:text-cream"
          />
          <label className="mb-1 block text-xs font-bold text-charcoal-800/50 dark:text-cream/40">
            Monthly food budget (KES)
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            onBlur={saveHousehold}
            className="w-full rounded-2xl bg-white px-4 py-3 font-bold text-charcoal-900 shadow-card outline-none dark:bg-charcoal-800 dark:text-cream"
          />
        </section>

        {/* Members */}
        <section>
          <SectionTitle>Housemates</SectionTitle>
          <div className="space-y-2">
            {data.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-card dark:bg-charcoal-800"
              >
                <Avatar member={m} size={38} />
                <span className="flex-1 font-display font-bold text-charcoal-900 dark:text-cream">
                  {m.name}
                </span>
                <button
                  onClick={() => setEditing(m)}
                  className="rounded-full p-2 text-charcoal-800/50 hover:bg-black/5 dark:text-cream/50"
                  aria-label="Edit"
                >
                  <Pencil size={16} />
                </button>
                {data.members.length > 1 && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="rounded-full p-2 text-charcoal-800/40 hover:bg-black/5 hover:text-red-500 dark:text-cream/40"
                    aria-label="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button variant="secondary" fullWidth onClick={() => setEditing(null)}>
              <Plus size={18} /> Add housemate
            </Button>
          </div>
        </section>

        {/* Data source + live sync */}
        <section>
          <SectionTitle>Sync across devices</SectionTitle>
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card dark:bg-charcoal-800">
            {usingSupabase ? (
              <Database size={20} className="text-avocado-600" />
            ) : (
              <HardDrive size={20} className="text-mango-600" />
            )}
            <div className="flex-1">
              <p className="font-display font-bold text-charcoal-900 dark:text-cream">
                {usingSupabase ? 'Supabase — live sync on' : 'This device only'}
              </p>
              <p className="text-xs font-semibold text-charcoal-800/50 dark:text-cream/40">
                {usingSupabase
                  ? 'Meals, votes and spending sync live across everyone in the house.'
                  : 'Your data lives on this device. Connect Supabase to share it live.'}
              </p>
            </div>
          </div>
          <SyncSettings />
        </section>

        <p className="pt-2 text-center text-xs font-semibold text-charcoal-800/40 dark:text-cream/40">
          MealMates · made for game-night meal debates 🍲
        </p>
      </div>

      {editing !== undefined && (
        <MemberEditor
          member={editing}
          onClose={() => setEditing(undefined)}
          makeId={() => newId('member')}
        />
      )}
    </Sheet>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-charcoal-800/50 dark:text-cream/40">
      {children}
    </h3>
  )
}
