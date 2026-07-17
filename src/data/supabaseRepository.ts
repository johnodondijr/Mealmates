import type { SupabaseClient } from '@supabase/supabase-js'
import type { Repository } from './repository'
import type {
  AppData,
  Expense,
  Food,
  MealEaten,
  Member,
  Preference,
  Settings,
  Vote,
  VoteBallot,
  VoteOption,
} from '../types'
import { buildSeedData } from './seed'
import { newId } from '../lib/id'

// Supabase adapter. Implements the same Repository contract as the local one,
// backed by the tables defined in supabase/migrations. Realtime subscribes to
// changes on the vote-related tables (and everything else) so votes update
// live across devices.
//
// Table columns map 1:1 to the domain types, so most methods are thin wrappers
// around `upsert` / `delete`.
export class SupabaseRepository implements Repository {
  constructor(private db: SupabaseClient) {}

  async loadAll(): Promise<AppData> {
    const [
      members,
      foods,
      preferences,
      votes,
      voteOptions,
      ballots,
      meals,
      expenses,
      settingsRow,
    ] = await Promise.all([
      this.db.from('members').select('*').order('created_at'),
      this.db.from('foods').select('*').order('created_at'),
      this.db.from('food_preferences').select('*'),
      this.db.from('votes').select('*').order('created_at'),
      this.db.from('vote_options').select('*'),
      this.db.from('vote_ballots').select('*'),
      this.db.from('meals_eaten').select('*'),
      this.db.from('expenses').select('*'),
      this.db.from('settings').select('*').limit(1).maybeSingle(),
    ])

    const seed = buildSeedData()

    // First run against an empty database: seed it once.
    if ((members.data?.length ?? 0) === 0) {
      await this.seed()
      return this.loadAll()
    }

    return {
      members: (members.data as Member[]) ?? [],
      foods: (foods.data as Food[]) ?? [],
      preferences: preferences.data ?? [],
      votes: (votes.data as Vote[]) ?? [],
      voteOptions: (voteOptions.data as VoteOption[]) ?? [],
      ballots: (ballots.data as VoteBallot[]) ?? [],
      meals: (meals.data as MealEaten[]) ?? [],
      expenses: (expenses.data as Expense[]) ?? [],
      settings: (settingsRow.data as Settings) ?? seed.settings,
    }
  }

  private async seed(): Promise<void> {
    const seed = buildSeedData()
    await this.db.from('members').upsert(seed.members)
    await this.db.from('foods').upsert(seed.foods)
    await this.db.from('food_preferences').upsert(seed.preferences)
    await this.db.from('meals_eaten').upsert(seed.meals)
    await this.db.from('expenses').upsert(seed.expenses)
    await this.db.from('settings').upsert(seed.settings)
  }

  subscribe(onChange: () => void): () => void {
    const channel = this.db
      .channel('mealmates-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => onChange())
      .subscribe()
    return () => {
      this.db.removeChannel(channel)
    }
  }

  async upsertMember(member: Member): Promise<void> {
    await this.db.from('members').upsert(member)
  }
  async removeMember(id: string): Promise<void> {
    await this.db.from('members').delete().eq('id', id)
  }

  async upsertFood(food: Food): Promise<void> {
    await this.db.from('foods').upsert(food)
  }
  async removeFood(id: string): Promise<void> {
    await this.db.from('foods').delete().eq('id', id)
  }

  async setPreference(
    memberId: string,
    foodId: string,
    pref: Preference | null,
  ): Promise<void> {
    await this.db
      .from('food_preferences')
      .delete()
      .eq('member_id', memberId)
      .eq('food_id', foodId)
    if (pref) {
      await this.db.from('food_preferences').insert({
        id: newId('pref'),
        member_id: memberId,
        food_id: foodId,
        preference: pref,
      })
    }
  }

  async createVote(vote: Vote, options: VoteOption[]): Promise<void> {
    await this.db.from('votes').insert(vote)
    await this.db.from('vote_options').insert(options)
  }

  async castBallot(ballot: VoteBallot): Promise<void> {
    await this.db
      .from('vote_ballots')
      .delete()
      .eq('vote_id', ballot.vote_id)
      .eq('member_id', ballot.member_id)
    await this.db.from('vote_ballots').insert(ballot)
  }

  async closeVote(voteId: string, winnerOptionId: string | null): Promise<void> {
    await this.db
      .from('votes')
      .update({ status: 'closed', winner_option_id: winnerOptionId })
      .eq('id', voteId)
  }

  async logMeal(meal: MealEaten): Promise<void> {
    await this.db.from('meals_eaten').insert(meal)
  }
  async removeMeal(id: string): Promise<void> {
    await this.db.from('meals_eaten').delete().eq('id', id)
  }

  async addExpense(expense: Expense): Promise<void> {
    await this.db.from('expenses').insert(expense)
  }
  async removeExpense(id: string): Promise<void> {
    await this.db.from('expenses').delete().eq('id', id)
  }

  async updateSettings(settings: Settings): Promise<void> {
    await this.db.from('settings').upsert(settings)
  }
}
