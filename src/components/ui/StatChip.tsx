import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface StatChipProps {
  icon: ReactNode // emoji or lucide icon
  value: ReactNode
  label: string
  className?: string
}

// The reference's nutrient-chip: a small white card with an icon, a bold
// value and a quiet grey label. Reused for a meal's cost / effort / time.
export function StatChip({ icon, value, label, className }: StatChipProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center gap-1 rounded-2xl bg-white px-2 py-3 text-center shadow-card ring-1 ring-charcoal-900/[0.04] dark:bg-charcoal-800 dark:ring-white/[0.06]',
        className,
      )}
    >
      <span className="flex h-6 items-center justify-center text-lg leading-none">
        {icon}
      </span>
      <span className="font-display text-[0.95rem] font-extrabold leading-none tracking-tight text-charcoal-900 dark:text-cream">
        {value}
      </span>
      <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-charcoal-800/45 dark:text-cream/40">
        {label}
      </span>
    </div>
  )
}
