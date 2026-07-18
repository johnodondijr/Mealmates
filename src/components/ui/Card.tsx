import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  tappable?: boolean
}

export function Card({ children, className, onClick, tappable }: CardProps) {
  const interactive = tappable || onClick
  return (
    <motion.div
      onClick={onClick}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      className={cn(
        'rounded-3xl bg-white shadow-card ring-1 ring-charcoal-900/[0.04] dark:bg-charcoal-800/70 dark:ring-white/[0.06] dark:backdrop-blur',
        interactive && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}
