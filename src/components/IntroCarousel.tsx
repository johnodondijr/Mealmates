import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'

// A short, swipeable explainer shown once before the create/join gate, so a
// first-time user understands what MealMates does in plain terms.

interface Slide {
  emoji: string
  accent: string // hero background
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    emoji: '🍲',
    accent: 'bg-paprika-500',
    title: 'Welcome to MealMates',
    body: "The no-drama way to settle “what are we eating?” — together with your household.",
  },
  {
    emoji: '🎰',
    accent: 'bg-mango-400',
    title: "Can't decide? Spin.",
    body: 'Tap spin and get a smart, balanced meal — a base, protein and veg that actually go together.',
  },
  {
    emoji: '🗳️',
    accent: 'bg-avocado-500',
    title: 'Or choose it your way',
    body: 'Build a plate from your food library, then eat it — or put a few options to a quick house vote.',
  },
  {
    emoji: '👨‍👩‍👧',
    accent: 'bg-paprika-500',
    title: 'Better together',
    body: 'Everyone in your household syncs live — votes, meals eaten and spending, all in one place.',
  },
]

interface IntroCarouselProps {
  onDone: () => void
}

export function IntroCarousel({ onDone }: IntroCarouselProps) {
  const [i, setI] = useState(0)
  const last = i === SLIDES.length - 1
  const slide = SLIDES[i]

  const next = () => (last ? onDone() : setI((n) => n + 1))

  return (
    <motion.div
      className="fixed inset-0 z-[75] flex flex-col bg-cream dark:bg-charcoal-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
        {/* Skip */}
        <div className="flex justify-end">
          <button
            onClick={onDone}
            className="px-2 py-1 text-sm font-bold text-charcoal-800/45 dark:text-cream/40"
          >
            Skip
          </button>
        </div>

        {/* Slide */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              <div
                className={cn(
                  'mb-8 flex h-40 w-40 items-center justify-center rounded-[2.25rem] text-[5.5rem] shadow-pop',
                  slide.accent,
                )}
              >
                {slide.emoji}
              </div>
              <h1 className="font-display text-[1.9rem] font-extrabold leading-tight tracking-tight text-charcoal-900 dark:text-cream">
                {slide.title}
              </h1>
              <p className="mt-3 max-w-xs text-[0.95rem] font-medium leading-relaxed text-charcoal-800/55 dark:text-cream/50">
                {slide.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {SLIDES.map((_, n) => (
            <button
              key={n}
              onClick={() => setI(n)}
              aria-label={`Slide ${n + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                n === i ? 'w-6 bg-paprika-500' : 'w-1.5 bg-charcoal-900/15 dark:bg-white/15',
              )}
            />
          ))}
        </div>

        <Button fullWidth size="lg" onClick={next}>
          {last ? "Let's get set up" : 'Next'}
          <ArrowRight size={20} />
        </Button>
      </div>
    </motion.div>
  )
}
