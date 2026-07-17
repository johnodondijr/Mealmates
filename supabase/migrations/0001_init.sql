-- MealMates schema — v1
-- Single shared household workspace. RLS stays permissive (trusted house).
-- Run this in the Supabase SQL editor (or via the Supabase CLI).

-- ---------- members ----------
create table if not exists public.members (
  id text primary key,
  name text not null,
  emoji text not null default '🙂',
  color text not null default '#F45A28',
  created_at timestamptz not null default now()
);

-- ---------- foods ----------
create table if not exists public.foods (
  id text primary key,
  name text not null,
  category text not null check (category in ('base','protein','veg','breakfast','treat')),
  emoji text not null default '🍲',
  cost numeric not null default 0,
  effort text not null default 'Medium' check (effort in ('Easy','Medium','Hard')),
  prep_minutes integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- food_preferences (member <-> food, love/refuse) ----------
create table if not exists public.food_preferences (
  id text primary key,
  member_id text not null references public.members(id) on delete cascade,
  food_id text not null references public.foods(id) on delete cascade,
  preference text not null check (preference in ('love','refuse')),
  unique (member_id, food_id)
);

-- ---------- votes ----------
create table if not exists public.votes (
  id text primary key,
  title text not null,
  slot text not null check (slot in ('breakfast','lunch','dinner')),
  status text not null default 'open' check (status in ('open','closed')),
  created_by text references public.members(id) on delete set null,
  winner_option_id text,
  created_at timestamptz not null default now()
);

-- ---------- vote_options ----------
create table if not exists public.vote_options (
  id text primary key,
  vote_id text not null references public.votes(id) on delete cascade,
  label text not null,
  base_id text references public.foods(id) on delete set null,
  protein_id text references public.foods(id) on delete set null,
  veg_id text references public.foods(id) on delete set null,
  total_cost numeric not null default 0
);

-- ---------- vote_ballots ----------
create table if not exists public.vote_ballots (
  id text primary key,
  vote_id text not null references public.votes(id) on delete cascade,
  option_id text not null references public.vote_options(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (vote_id, member_id)
);

-- ---------- meals_eaten ----------
create table if not exists public.meals_eaten (
  id text primary key,
  slot text not null check (slot in ('breakfast','lunch','dinner')),
  label text not null,
  base_id text references public.foods(id) on delete set null,
  protein_id text references public.foods(id) on delete set null,
  veg_id text references public.foods(id) on delete set null,
  cost numeric not null default 0,
  eaten_on date not null default current_date,
  logged_by text references public.members(id) on delete set null,
  from_vote_id text references public.votes(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- expenses ----------
create table if not exists public.expenses (
  id text primary key,
  amount numeric not null default 0,
  description text not null,
  category text not null default 'other',
  paid_by text references public.members(id) on delete set null,
  spent_on date not null default current_date,
  meal_id text references public.meals_eaten(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- settings (single row) ----------
create table if not exists public.settings (
  id text primary key default 'settings',
  household_name text not null default 'Our Household',
  monthly_budget numeric not null default 30000,
  budget_mode boolean not null default false,
  currency text not null default 'KES'
);

-- ---------- indexes ----------
create index if not exists idx_prefs_member on public.food_preferences(member_id);
create index if not exists idx_prefs_food on public.food_preferences(food_id);
create index if not exists idx_options_vote on public.vote_options(vote_id);
create index if not exists idx_ballots_vote on public.vote_ballots(vote_id);
create index if not exists idx_meals_date on public.meals_eaten(eaten_on);
create index if not exists idx_expenses_date on public.expenses(spent_on);

-- ---------- Realtime ----------
-- Add every table to the realtime publication so votes (and everything else)
-- update live across devices.
do $$
declare t text;
begin
  foreach t in array array[
    'members','foods','food_preferences','votes','vote_options',
    'vote_ballots','meals_eaten','expenses','settings'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- Row Level Security (permissive for v1) ----------
-- Trusted household, single shared workspace: allow the anon key full access.
-- Tighten this later if you add real auth.
do $$
declare t text;
begin
  foreach t in array array[
    'members','foods','food_preferences','votes','vote_options',
    'vote_ballots','meals_eaten','expenses','settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'drop policy if exists "allow all" on public.%I', t
    );
    execute format(
      'create policy "allow all" on public.%I for all using (true) with check (true)',
      t
    );
  end loop;
end $$;
