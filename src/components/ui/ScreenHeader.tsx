import type { ReactNode } from 'react'

interface ScreenHeaderProps {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
}

// Consistent page heading: confident title + quiet subtitle, generous top space.
export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3 px-1 pb-1 pt-3">
      <div className="min-w-0">
        <h2 className="font-display text-[1.7rem] font-extrabold leading-tight tracking-[-0.02em] text-charcoal-900 dark:text-cream">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-sm font-medium leading-snug text-charcoal-800/55 dark:text-cream/45">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
