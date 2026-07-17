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
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-cream p-5 pb-8 shadow-2xl dark:bg-charcoal-900 no-scrollbar safe-bottom"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-charcoal-100 dark:bg-charcoal-800" />
            <div className="mb-4 flex items-center justify-between">
              {title && (
                <h2 className="font-display text-2xl font-extrabold text-charcoal-900 dark:text-cream">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className="ml-auto rounded-full p-2 text-charcoal-800 hover:bg-black/5 dark:text-cream dark:hover:bg-white/10"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
