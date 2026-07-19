import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Sheet } from './ui/Sheet'

interface RequestsSheetProps {
  onClose: () => void
}

// Admin inbox: approve or deny people asking to join the household.
export function RequestsSheet({ onClose }: RequestsSheetProps) {
  const { pendingRequests, approveJoinRequest, denyJoinRequest } = useApp()
  const [busyId, setBusyId] = useState<string | null>(null)

  return (
    <Sheet open onClose={onClose} title="Join requests">
      {pendingRequests.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-5xl">📭</p>
          <p className="mt-3 font-display font-bold text-charcoal-800/60 dark:text-cream/50">
            No one's waiting to join right now.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pendingRequests.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-card dark:bg-charcoal-800"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: r.color + '26', border: `2px solid ${r.color}` }}
              >
                {r.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-bold text-charcoal-900 dark:text-cream">
                  {r.name}
                </p>
                <p className="text-xs font-semibold text-charcoal-800/50 dark:text-cream/40">
                  wants to join
                </p>
              </div>
              <button
                onClick={async () => {
                  setBusyId(r.id)
                  await denyJoinRequest(r.id)
                  setBusyId(null)
                }}
                disabled={busyId === r.id}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal-900/[0.05] text-charcoal-800/60 active:scale-90 disabled:opacity-40 dark:bg-white/[0.06] dark:text-cream/50"
                aria-label={`Deny ${r.name}`}
              >
                <X size={19} strokeWidth={2.6} />
              </button>
              <button
                onClick={async () => {
                  setBusyId(r.id)
                  await approveJoinRequest(r)
                  setBusyId(null)
                }}
                disabled={busyId === r.id}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-avocado-500 text-white shadow-pop active:scale-90 disabled:opacity-40"
                aria-label={`Approve ${r.name}`}
              >
                <Check size={19} strokeWidth={2.8} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}
