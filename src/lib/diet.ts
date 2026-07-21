import type { Food, Member } from '../types'

// Per-member dietary restrictions. These are respected as a HARD rule by the
// suggestion engine — a restricted food is never suggested when that member is
// among who's eating.

// Presets a member can toggle (shown in the member editor).
export const DIET_OPTIONS: { id: string; label: string; emoji: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥦' },
  { id: 'no-pork', label: 'No pork', emoji: '🚫🐖' },
  { id: 'no-beef', label: 'No beef', emoji: '🚫🐄' },
  { id: 'no-fish', label: 'No fish', emoji: '🚫🐟' },
  { id: 'no-eggs', label: 'No eggs', emoji: '🚫🥚' },
]

// What each preset rules out, in terms of the food tags below.
const DIET_EXCLUDES: Record<string, string[]> = {
  vegetarian: ['meat', 'pork', 'beef', 'fish', 'poultry', 'offal'],
  'no-pork': ['pork'],
  'no-beef': ['beef'],
  'no-fish': ['fish'],
  'no-eggs': ['egg'],
}

// What each food "contains", for diet matching.
export const DIET_TAGS: Record<string, string[]> = {
  food_beef_stew: ['meat', 'beef'],
  food_boiled_meat: ['meat', 'beef'],
  food_chicken_wet_fry_: ['meat', 'poultry'],
  food_chicken_dry_fry_: ['meat', 'poultry'],
  food_kienyeji_chicken: ['meat', 'poultry'],
  food_goat_stew: ['meat'],
  food_pork: ['meat', 'pork'],
  food_nyama_choma: ['meat'],
  food_minced_meat: ['meat', 'beef'],
  food_matumbo: ['meat', 'offal'],
  food_liver_maini_: ['meat', 'offal'],
  food_mutura: ['meat', 'offal'],
  food_fried_tilapia: ['fish'],
  food_fish_stew: ['fish'],
  food_omena: ['fish'],
  food_eggs: ['egg'],
  food_boiled_eggs: ['egg'],
  food_sausages: ['meat'],
  food_sausages_treat: ['meat'],
  food_smokies: ['meat'],
}

// The set of food ids that any present member's diet rules out.
export function dietBlockedFoodIds(
  members: Member[],
  foods: Food[],
  presentIds: string[],
): Set<string> {
  const excluded = new Set<string>()
  for (const m of members) {
    if (!presentIds.includes(m.id) || !m.diet) continue
    for (const d of m.diet) for (const t of DIET_EXCLUDES[d] ?? []) excluded.add(t)
  }
  const blocked = new Set<string>()
  if (excluded.size === 0) return blocked
  for (const f of foods) {
    const tags = DIET_TAGS[f.id] ?? []
    if (tags.some((t) => excluded.has(t))) blocked.add(f.id)
  }
  return blocked
}
