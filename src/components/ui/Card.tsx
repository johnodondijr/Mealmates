import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  tappable?: boolean
  // Flat = hairline outline only, no drop shadow. For list rows / grouped
  // containers where a raised card would feel bulky.
  flat?: boolean
}

export function Card({ children, className, onClick, tappable, flat }: CardProps) {
  const interactive = tappable || onClick
  return (
    <motion.div
      onClick={onClick}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      className={cn(
        'rounded-3xl bg-white ring-1 ring-charcoal-900/[0.05] dark:bg-charcoal-800/70 dark:ring-white/[0.06] dark:backdrop-blur',
        flat ? 'shadow-none' : 'shadow-card',
        interactive && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}
