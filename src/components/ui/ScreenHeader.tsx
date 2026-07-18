import type { ReactNode } from 'react'

interface ScreenHeaderProps {
  title: string
  // Optional second line rendered in grey, for a two-tone hero heading
  // (e.g. "What are we" / "eating today?").
  muted?: string
  subtitle?: ReactNode
  action?: ReactNode
}

// Big, confident, left-aligned heading — the reference's signature.
export function ScreenHeader({ title, muted, subtitle, action }: ScreenHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 px-1 pb-1 pt-3">
      <div className="min-w-0">
        <h2 className="font-display text-[2.05rem] font-extrabold leading-[1.06] tracking-[-0.03em] text-charcoal-900 dark:text-cream">
          {title}
          {muted && (
            <span className="block text-charcoal-900/35 dark:text-cream/30">{muted}</span>
          )}
        </h2>
        {subtitle && (
          <p className="mt-2 text-[0.9rem] font-medium leading-snug text-charcoal-800/55 dark:text-cream/45">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </div>
  )
}
