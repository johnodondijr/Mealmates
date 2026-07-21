import type {
  AppData,
  Expense,
  Food,
  MealEaten,
  Member,
  PlannedMeal,
  Preference,
  Settings,
  Vote,
  VoteBallot,
  VoteOption,
} from '../types'

// The data-layer contract. Both the localStorage adapter and the Supabase
// adapter implement this, so the UI never needs to know which one is live.
export interface Repository {
  loadAll(): Promise<AppData>

  // Realtime: fires whenever data changes elsewhere (other tab / other device).
  // The caller reloads the snapshot in response.
  subscribe(onChange: () => void): () => void

  upsertMember(member: Member): Promise<void>
  removeMember(id: string): Promise<void>

  upsertFood(food: Food): Promise<void>
  removeFood(id: string): Promise<void>

  // pref === null clears the member's preference for that food.
  setPreference(
    memberId: string,
    foodId: string,
    pref: Preference | null,
  ): Promise<void>

  // Per-member "don't suggest this exact combo to me again". on=false undoes it.
  setComboDislike(memberId: string, signature: string, on: boolean): Promise<void>

  // Weekly plan: set (upsert) or clear the meal planned for a day + slot.
  setPlannedMeal(meal: PlannedMeal): Promise<void>
  removePlannedMeal(id: string): Promise<void>

  // "I want to eat this today" pick. on=false removes it.
  setWish(
    memberId: string,
    foodId: string,
    wishedOn: string,
    on: boolean,
  ): Promise<void>
  clearWishes(wishedOn: string): Promise<void>

  createVote(vote: Vote, options: VoteOption[]): Promise<void>
  castBallot(ballot: VoteBallot): Promise<void>
  closeVote(voteId: string, winnerOptionId: string | null): Promise<void>

  logMeal(meal: MealEaten): Promise<void>
  updateMeal(meal: MealEaten): Promise<void>
  removeMeal(id: string): Promise<void>

  addExpense(expense: Expense): Promise<void>
  removeExpense(id: string): Promise<void>

  updateSettings(settings: Settings): Promise<void>
}
