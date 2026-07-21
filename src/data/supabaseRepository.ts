import type { SupabaseClient } from '@supabase/supabase-js'
import type { Repository } from './repository'
import type {
  AppData,
  Expense,
  Food,
  Household,
  MealEaten,
  Member,
  Preference,
  Settings,
  Vote,
  VoteBallot,
  VoteOption,
} from '../types'
import { SEED_FOODS } from './seed'
import { newId } from '../lib/id'

// Supabase adapter, scoped to one household. The food catalog is shared across
// the whole project (stable ids keep the pairing engine working); everything
// else is filtered by household_id so households stay isolated. Realtime
// subscribes to all changes so votes/meals update live across devices.
export class SupabaseRepository implements Repository {
  constructor(
    private db: SupabaseClient,
    private householdId: string,
  ) {}

  private stamp<T extends object>(row: T): T & { household_id: string } {
    return { ...row, household_id: this.householdId }
  }

  async loadAll(): Promise<AppData> {
    const hh = this.householdId
    const [
      household,
      members,
      foods,
      preferences,
      comboDislikes,
      wishes,
      votes,
      voteOptions,
      ballots,
      meals,
      expenses,
    ] = await Promise.all([
      this.db.from('households').select('*').eq('id', hh).maybeSingle(),
      this.db.from('members').select('*').eq('household_id', hh).order('created_at'),
      this.db.from('foods').select('*').order('created_at'),
      this.db.from('food_preferences').select('*').eq('household_id', hh),
      this.db.from('combo_dislikes').select('*').eq('household_id', hh),
      this.db.from('meal_wishes').select('*').eq('household_id', hh),
      this.db.from('votes').select('*').eq('household_id', hh).order('created_at'),
      this.db.from('vote_options').select('*').eq('household_id', hh),
      this.db.from('vote_ballots').select('*').eq('household_id', hh),
      this.db.from('meals_eaten').select('*').eq('household_id', hh),
      this.db.from('expenses').select('*').eq('household_id', hh),
    ])

    // The shared catalog is seeded once per project; be defensive on an empty DB.
    if ((foods.data?.length ?? 0) === 0) {
      await this.db.from('foods').upsert(SEED_FOODS)
      return this.loadAll()
    }

    const h = household.data as Household | null
    const settings: Settings = {
      id: hh,
      household_name: h?.name ?? 'Our Household',
      monthly_budget: h?.monthly_budget ?? 30000,
      budget_mode: h?.budget_mode ?? false,
      currency: h?.currency ?? 'KES',
      owner_member_id: h?.owner_member_id ?? null,
      admin_email: h?.admin_email ?? null,
    }

    return {
      members: (members.data as Member[]) ?? [],
      foods: (foods.data as Food[]) ?? [],
      preferences: preferences.data ?? [],
      comboDislikes: comboDislikes.data ?? [],
      wishes: wishes.data ?? [],
      votes: (votes.data as Vote[]) ?? [],
      voteOptions: (voteOptions.data as VoteOption[]) ?? [],
      ballots: (ballots.data as VoteBallot[]) ?? [],
      meals: (meals.data as MealEaten[]) ?? [],
      expenses: (expenses.data as Expense[]) ?? [],
      settings,
    }
  }

  subscribe(onChange: () => void): () => void {
    const channel = this.db
      .channel(`mealmates-${this.householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, () => onChange())
      .subscribe()
    return () => {
      this.db.removeChannel(channel)
    }
  }

  async upsertMember(member: Member): Promise<void> {
    await this.db.from('members').upsert(this.stamp(member))
  }
  async removeMember(id: string): Promise<void> {
    await this.db.from('members').delete().eq('id', id).eq('household_id', this.householdId)
  }

  // Foods are the shared catalog — no household stamp.
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
      await this.db.from('food_preferences').insert(
        this.stamp({
          id: newId('pref'),
          member_id: memberId,
          food_id: foodId,
          preference: pref,
        }),
      )
    }
  }

  async setComboDislike(memberId: string, signature: string, on: boolean): Promise<void> {
    await this.db
      .from('combo_dislikes')
      .delete()
      .eq('member_id', memberId)
      .eq('signature', signature)
    if (on) {
      await this.db.from('combo_dislikes').insert(
        this.stamp({ id: newId('dislike'), member_id: memberId, signature }),
      )
    }
  }

  async setWish(
    memberId: string,
    foodId: string,
    wishedOn: string,
    on: boolean,
  ): Promise<void> {
    await this.db
      .from('meal_wishes')
      .delete()
      .eq('member_id', memberId)
      .eq('food_id', foodId)
      .eq('wished_on', wishedOn)
    if (on) {
      await this.db.from('meal_wishes').insert(
        this.stamp({
          id: newId('wish'),
          member_id: memberId,
          food_id: foodId,
          wished_on: wishedOn,
        }),
      )
    }
  }

  async clearWishes(wishedOn: string): Promise<void> {
    await this.db
      .from('meal_wishes')
      .delete()
      .eq('wished_on', wishedOn)
      .eq('household_id', this.householdId)
  }

  async createVote(vote: Vote, options: VoteOption[]): Promise<void> {
    await this.db.from('votes').insert(this.stamp(vote))
    await this.db.from('vote_options').insert(options.map((o) => this.stamp(o)))
  }

  async castBallot(ballot: VoteBallot): Promise<void> {
    await this.db
      .from('vote_ballots')
      .delete()
      .eq('vote_id', ballot.vote_id)
      .eq('member_id', ballot.member_id)
    await this.db.from('vote_ballots').insert(this.stamp(ballot))
  }

  async closeVote(voteId: string, winnerOptionId: string | null): Promise<void> {
    await this.db
      .from('votes')
      .update({ status: 'closed', winner_option_id: winnerOptionId })
      .eq('id', voteId)
      .eq('household_id', this.householdId)
  }

  async logMeal(meal: MealEaten): Promise<void> {
    await this.db.from('meals_eaten').insert(this.stamp(meal))
  }
  async updateMeal(meal: MealEaten): Promise<void> {
    await this.db
      .from('meals_eaten')
      .update(this.stamp(meal))
      .eq('id', meal.id)
      .eq('household_id', this.householdId)
  }
  async removeMeal(id: string): Promise<void> {
    await this.db.from('meals_eaten').delete().eq('id', id).eq('household_id', this.householdId)
  }

  async addExpense(expense: Expense): Promise<void> {
    await this.db.from('expenses').insert(this.stamp(expense))
  }
  async removeExpense(id: string): Promise<void> {
    await this.db.from('expenses').delete().eq('id', id).eq('household_id', this.householdId)
  }

  // Household settings live on the households row.
  async updateSettings(settings: Settings): Promise<void> {
    await this.db
      .from('households')
      .update({
        name: settings.household_name,
        monthly_budget: settings.monthly_budget,
        budget_mode: settings.budget_mode,
        currency: settings.currency,
        admin_email: settings.admin_email ?? null,
      })
      .eq('id', this.householdId)
  }
}
