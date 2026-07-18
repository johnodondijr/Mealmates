import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: Variant
  size?: Size
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  // Near-black in light mode, inverts to light in dark — the reference's
  // confident monochrome primary action.
  primary:
    'bg-charcoal-900 text-cream shadow-pop hover:bg-charcoal-950 active:bg-black dark:bg-cream dark:text-charcoal-950 dark:hover:bg-white',
  // Green accent action for positive/secondary emphasis.
  accent:
    'bg-paprika-500 text-white shadow-pop hover:bg-paprika-600 active:bg-paprika-700',
  secondary:
    'bg-white text-charcoal-900 ring-1 ring-charcoal-900/[0.06] shadow-card hover:bg-charcoal-50 dark:bg-charcoal-800 dark:text-cream dark:ring-white/[0.08] dark:hover:bg-charcoal-800/70',
  ghost:
    'bg-transparent text-charcoal-800 hover:bg-black/5 dark:text-cream dark:hover:bg-white/10',
  danger: 'bg-red-500 text-white hover:bg-red-600',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-4 py-2.5 text-base rounded-2xl',
  lg: 'px-6 py-4 text-lg rounded-3xl',
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  type = 'button',
  fullWidth,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-display font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {children}
    </motion.button>
  )
}
