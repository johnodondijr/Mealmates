// ---- Domain types shared across the app ----

export type FoodCategory =
  | 'base'
  | 'protein'
  | 'veg'
  | 'fruit'
  | 'drink'
  | 'breakfast'
  | 'treat'

export type Effort = 'Easy' | 'Medium' | 'Hard'

// Moisture/texture — used to build balanced meals: a dry starch should be
// paired with a saucy protein or veg, never dry-on-dry.
export type Texture = 'dry' | 'saucy' | 'neutral'

export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

export interface Member {
  id: string
  name: string
  emoji: string
  color: string // hex
  created_at: string
}

export interface Ingredient {
  id: string
  name: string
  cost: number // KES
}

export interface Food {
  id: string
  name: string
  category: FoodCategory
  emoji: string
  cost: number // rough KES estimate (or the sum of ingredient costs)
  effort: Effort
  prep_minutes: number
  // Texture for balanced-meal pairing (dry starch ↔ saucy protein/veg).
  texture: Texture
  // When false, the food stays in the library and can be picked manually,
  // but the suggestion engine never proposes it (e.g. Chips/Fries).
  suggestable: boolean
  // Whether the household currently has this / it's in reach. Unavailable
  // foods stay in the library but are never suggested until marked back.
  available: boolean
  // Optional itemised ingredient cost breakdown for this food.
  ingredients: Ingredient[]
  created_at: string
}

export type Preference = 'love' | 'refuse'

export interface FoodPreference {
  id: string
  member_id: string
  food_id: string
  preference: Preference
}

export interface Combo {
  base?: Food
  protein?: Food
  veg?: Food
}

export interface ScoredCombo extends Combo {
  score: number
  totalCost: number
  reasons: string[]
}

export type VoteStatus = 'open' | 'closed'

export interface Vote {
  id: string
  title: string
  slot: MealSlot
  status: VoteStatus
  created_by: string
  winner_option_id: string | null
  created_at: string
}

export interface VoteOption {
  id: string
  vote_id: string
  label: string
  // Foods that make up the combo (ids, denormalized for the local adapter).
  base_id: string | null
  protein_id: string | null
  veg_id: string | null
  total_cost: number
}

export interface VoteBallot {
  id: string
  vote_id: string
  option_id: string
  member_id: string
  created_at: string
}

// Actual per-item cost captured when a meal is cooked/eaten.
export interface MealCost {
  food_id: string | null // null for ad-hoc lines (e.g. "oil", "spices")
  label: string
  amount: number // KES
}

export interface MealEaten {
  id: string
  slot: MealSlot
  label: string
  base_id: string | null
  protein_id: string | null
  veg_id: string | null
  cost: number // total actual cost for the day (sum of component_costs)
  component_costs: MealCost[] // itemised actual costs
  eaten_on: string // ISO date (yyyy-mm-dd)
  logged_by: string
  from_vote_id: string | null
  created_at: string
}

// A member's "I want to eat this today" pick.
export interface MealWish {
  id: string
  member_id: string
  food_id: string
  wished_on: string // ISO date
}

export interface Expense {
  id: string
  amount: number // KES
  description: string
  category: FoodCategory | 'groceries' | 'other'
  paid_by: string
  spent_on: string // ISO date
  meal_id: string | null
  created_at: string
}

export interface Settings {
  id: string
  household_name: string
  monthly_budget: number // KES
  budget_mode: boolean
  currency: string
}

export interface AppData {
  members: Member[]
  foods: Food[]
  preferences: FoodPreference[]
  wishes: MealWish[]
  votes: Vote[]
  voteOptions: VoteOption[]
  ballots: VoteBallot[]
  meals: MealEaten[]
  expenses: Expense[]
  settings: Settings
}
