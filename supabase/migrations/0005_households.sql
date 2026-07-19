-- MealMates schema — v5
-- Multi-household support. One Supabase project can now host several isolated
-- households; members join one by its short code and only ever see that
-- household's members, meals, votes, wishes and spending.
--
-- The food *catalog* stays global (a shared Kenyan food library keeps the
-- pairing engine's stable ids working); everything household-specific gets a
-- household_id. Safe to run on top of 0001–0004.

-- ---------- households ----------
create table if not exists public.households (
  id text primary key,                    -- short, shareable join code
  name text not null default 'Our Household',
  monthly_budget numeric not null default 30000,
  budget_mode boolean not null default false,
  currency text not null default 'KES',
  created_at timestamptz not null default now()
);

-- ---------- add household_id to the household-scoped tables ----------
alter table public.members            add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.food_preferences   add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.meal_wishes        add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.votes              add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.vote_options       add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.vote_ballots       add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.meals_eaten        add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.expenses           add column if not exists household_id text references public.households(id) on delete cascade;

-- ---------- indexes on household_id ----------
create index if not exists idx_members_hh   on public.members(household_id);
create index if not exists idx_prefs_hh      on public.food_preferences(household_id);
create index if not exists idx_wishes_hh     on public.meal_wishes(household_id);
create index if not exists idx_votes_hh      on public.votes(household_id);
create index if not exists idx_options_hh    on public.vote_options(household_id);
create index if not exists idx_ballots_hh    on public.vote_ballots(household_id);
create index if not exists idx_meals_hh      on public.meals_eaten(household_id);
create index if not exists idx_expenses_hh   on public.expenses(household_id);

-- ---------- Realtime + permissive RLS for households ----------
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.households';
  exception when duplicate_object then null;
  end;
end $$;

alter table public.households enable row level security;
drop policy if exists "allow all" on public.households;
create policy "allow all" on public.households
  for all using (true) with check (true);
