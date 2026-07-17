import type { MealSlot, ScoredCombo, Vote, VoteOption } from '../types'
import { comboLabel } from '../engine/suggest'
import { newId } from './id'

// Turn a set of combos into a ready-to-create Vote + its options.
export function buildVoteFromCombos(
  createdBy: string,
  slot: MealSlot,
  title: string,
  combos: ScoredCombo[],
): { vote: Vote; options: VoteOption[] } {
  const voteId = newId('vote')
  const vote: Vote = {
    id: voteId,
    title,
    slot,
    status: 'open',
    created_by: createdBy,
    winner_option_id: null,
    created_at: new Date().toISOString(),
  }
  const options: VoteOption[] = combos
    .filter((c) => comboLabel(c))
    .slice(0, 4)
    .map((c) => ({
      id: newId('opt'),
      vote_id: voteId,
      label: comboLabel(c),
      base_id: c.base?.id ?? null,
      protein_id: c.protein?.id ?? null,
      veg_id: c.veg?.id ?? null,
      total_cost: c.totalCost,
    }))
  return { vote, options }
}
