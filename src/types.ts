// ---- Domain types shared across the app ----

export type FoodCategory =
  | 'base'
  | 'protein'
  | 'veg'
  | 'breakfast'
  | 'treat'

export type Effort = 'Easy' | 'Medium' | 'Hard'

export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

export interface Member {
  id: string
  name: string
  emoji: string
  color: string // hex
  created_at: string
}

export interface Food {
  id: string
  name: string
  category: FoodCategory
  emoji: string
  cost: number // rough KES estimate
  effort: Effort
  prep_minutes: number
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

export interface MealEaten {
  id: string
  slot: MealSlot
  label: string
  base_id: string | null
  protein_id: string | null
  veg_id: string | null
  cost: number
  eaten_on: string // ISO date (yyyy-mm-dd)
  logged_by: string
  from_vote_id: string | null
  created_at: string
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
  votes: Vote[]
  voteOptions: VoteOption[]
  ballots: VoteBallot[]
  meals: MealEaten[]
  expenses: Expense[]
  settings: Settings
}
