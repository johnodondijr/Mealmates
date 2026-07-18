import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

// A mobile-first bottom sheet.
export function Sheet({ open, onClose, title, children }: SheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="no-scrollbar safe-bottom fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-[2rem] bg-cream px-5 pb-9 pt-3 shadow-sheet dark:bg-charcoal-950"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-charcoal-900/15 dark:bg-white/15" />
            <div className="mb-5 flex items-center justify-between">
              {title && (
                <h2 className="font-display text-[1.6rem] font-extrabold tracking-[-0.02em] text-charcoal-900 dark:text-cream">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-charcoal-800 ring-1 ring-charcoal-900/[0.05] active:scale-95 dark:bg-charcoal-800 dark:text-cream dark:ring-white/[0.06]"
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
