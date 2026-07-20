-- MealMates — full schema (one-paste setup)
-- Paste this whole file into your Supabase project's SQL editor and run it.
-- It creates every table, enables Realtime, and opens permissive RLS.
-- Safe to re-run (idempotent).
--
-- This is the consolidation of supabase/migrations/0001–0005. If you prefer,
-- run those migrations in order instead — the end state is identical.
--
-- One project can host several isolated households: people join one by its
-- short code and only see that household's members, meals, votes and spending.
-- The food *catalog* is shared across households (keeps the pairing engine's
-- stable ids working); everything else is scoped by household_id.

-- ---------- households ----------
create table if not exists public.households (
  id text primary key,                    -- short, shareable join code
  name text not null default 'Our Household',
  monthly_budget numeric not null default 30000,
  budget_mode boolean not null default false,
  currency text not null default 'KES',
  owner_member_id text,                    -- the admin who approves joins
  admin_email text,                        -- optional: notify on join requests
  created_at timestamptz not null default now()
);
alter table public.households add column if not exists owner_member_id text;
alter table public.households add column if not exists admin_email text;

-- ---------- join_requests (admin-approved joins) ----------
create table if not exists public.join_requests (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  name text not null,
  emoji text not null default '🙂',
  color text not null default '#C4704F',
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  member_id text,
  requester_auth_id text,
  created_at timestamptz not null default now()
);
alter table public.join_requests add column if not exists requester_auth_id text;
create index if not exists idx_join_requests_hh on public.join_requests(household_id);
create index if not exists idx_join_requests_status on public.join_requests(status);

-- ---------- members ----------
create table if not exists public.members (
  id text primary key,
  household_id text references public.households(id) on delete cascade,
  name text not null,
  emoji text not null default '🙂',
  color text not null default '#C4704F',
  auth_id text,
  created_at timestamptz not null default now()
);
alter table public.members add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.members add column if not exists auth_id text;
create index if not exists idx_members_auth on public.members(auth_id);

-- ---------- foods ----------
create table if not exists public.foods (
  id text primary key,
  name text not null,
  category text not null,
  emoji text not null default '🍲',
  cost numeric not null default 0,
  effort text not null default 'Medium' check (effort in ('Easy','Medium','Hard')),
  prep_minutes integer not null default 0,
  texture text not null default 'neutral' check (texture in ('dry','saucy','neutral')),
  suggestable boolean not null default true,
  available boolean not null default true,
  ingredients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.foods drop constraint if exists foods_category_check;
alter table public.foods
  add constraint foods_category_check
  check (category in ('base','protein','veg','fruit','drink','breakfast','treat'));
-- Backfill columns if the table pre-existed from an older setup.
alter table public.foods add column if not exists texture text not null default 'neutral';
alter table public.foods add column if not exists suggestable boolean not null default true;
alter table public.foods add column if not exists available boolean not null default true;
alter table public.foods add column if not exists ingredients jsonb not null default '[]'::jsonb;

-- ---------- food_preferences (member <-> food, love/refuse) ----------
create table if not exists public.food_preferences (
  id text primary key,
  household_id text references public.households(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  food_id text not null references public.foods(id) on delete cascade,
  preference text not null check (preference in ('love','refuse')),
  unique (member_id, food_id)
);

-- ---------- meal_wishes ("I want this today") ----------
create table if not exists public.meal_wishes (
  id text primary key,
  household_id text references public.households(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  food_id text not null references public.foods(id) on delete cascade,
  wished_on date not null default current_date,
  unique (member_id, food_id, wished_on)
);

-- ---------- votes ----------
create table if not exists public.votes (
  id text primary key,
  household_id text references public.households(id) on delete cascade,
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
  household_id text references public.households(id) on delete cascade,
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
  household_id text references public.households(id) on delete cascade,
  vote_id text not null references public.votes(id) on delete cascade,
  option_id text not null references public.vote_options(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (vote_id, member_id)
);

-- ---------- meals_eaten ----------
create table if not exists public.meals_eaten (
  id text primary key,
  household_id text references public.households(id) on delete cascade,
  slot text not null check (slot in ('breakfast','lunch','dinner')),
  label text not null,
  base_id text references public.foods(id) on delete set null,
  protein_id text references public.foods(id) on delete set null,
  veg_id text references public.foods(id) on delete set null,
  cost numeric not null default 0,
  component_costs jsonb not null default '[]'::jsonb,
  eaten_on date not null default current_date,
  logged_by text references public.members(id) on delete set null,
  from_vote_id text references public.votes(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.meals_eaten add column if not exists component_costs jsonb not null default '[]'::jsonb;

-- ---------- expenses ----------
create table if not exists public.expenses (
  id text primary key,
  household_id text references public.households(id) on delete cascade,
  amount numeric not null default 0,
  description text not null,
  category text not null default 'other',
  paid_by text references public.members(id) on delete set null,
  spent_on date not null default current_date,
  meal_id text references public.meals_eaten(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- settings (single row — legacy; household settings now live on
-- the households row. Kept so older single-workspace setups still work.) ------
create table if not exists public.settings (
  id text primary key default 'settings',
  household_name text not null default 'Our Household',
  monthly_budget numeric not null default 30000,
  budget_mode boolean not null default false,
  currency text not null default 'KES'
);

-- ---------- backfill household_id on setups that pre-date v5 ----------
alter table public.members          add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.food_preferences add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.meal_wishes      add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.votes            add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.vote_options     add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.vote_ballots     add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.meals_eaten      add column if not exists household_id text references public.households(id) on delete cascade;
alter table public.expenses         add column if not exists household_id text references public.households(id) on delete cascade;

-- ---------- indexes ----------
create index if not exists idx_prefs_member on public.food_preferences(member_id);
create index if not exists idx_prefs_food on public.food_preferences(food_id);
create index if not exists idx_wishes_day on public.meal_wishes(wished_on);
create index if not exists idx_options_vote on public.vote_options(vote_id);
create index if not exists idx_ballots_vote on public.vote_ballots(vote_id);
create index if not exists idx_meals_date on public.meals_eaten(eaten_on);
create index if not exists idx_expenses_date on public.expenses(spent_on);
create index if not exists idx_members_hh on public.members(household_id);
create index if not exists idx_prefs_hh on public.food_preferences(household_id);
create index if not exists idx_wishes_hh on public.meal_wishes(household_id);
create index if not exists idx_votes_hh on public.votes(household_id);
create index if not exists idx_options_hh on public.vote_options(household_id);
create index if not exists idx_ballots_hh on public.vote_ballots(household_id);
create index if not exists idx_meals_hh on public.meals_eaten(household_id);
create index if not exists idx_expenses_hh on public.expenses(household_id);

-- ---------- data fixes ----------
-- Weetabix is a wet, milk-based breakfast — group it with the drinks so a
-- breakfast spin never pairs it with tea/coffee.
update public.foods set category = 'drink', texture = 'saucy' where id = 'food_weetabix';
-- Boiled maize is a snack/breakfast, not a dinner base.
update public.foods set category = 'breakfast' where id = 'food_boiled_maize';

-- ---------- Realtime + permissive RLS ----------
do $$
declare t text;
begin
  foreach t in array array[
    'households','members','foods','food_preferences','meal_wishes','votes',
    'vote_options','vote_ballots','meals_eaten','expenses','settings','join_requests'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "allow all" on public.%I', t);
    execute format(
      'create policy "allow all" on public.%I for all using (true) with check (true)', t
    );
  end loop;
end $$;
