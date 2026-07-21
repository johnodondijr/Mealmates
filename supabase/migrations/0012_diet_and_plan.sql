-- MealMates schema — v12
-- Per-member diet restrictions + the weekly plan. Safe to re-run. Works whether
-- or not the strict RLS from 0009 is applied (picks the matching policy).

-- Dietary restrictions on a member (preset ids like 'vegetarian','no-pork').
alter table public.members add column if not exists diet text[];

-- ---------- planned_meals (weekly plan) ----------
create table if not exists public.planned_meals (
  id text primary key,
  household_id text references public.households(id) on delete cascade,
  plan_date date not null,
  slot text not null check (slot in ('breakfast','lunch','dinner')),
  label text not null,
  base_id text references public.foods(id) on delete set null,
  protein_id text references public.foods(id) on delete set null,
  veg_id text references public.foods(id) on delete set null,
  created_by text references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, plan_date, slot)
);
create index if not exists idx_planned_meals_hh on public.planned_meals(household_id);

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.planned_meals';
  exception when duplicate_object then null; end;
end $$;

alter table public.planned_meals enable row level security;
drop policy if exists "allow all" on public.planned_meals;
drop policy if exists "hh members" on public.planned_meals;
do $$
begin
  if exists (
    select 1 from pg_proc where proname = 'my_household_ids' and pronamespace = 'public'::regnamespace
  ) then
    execute 'create policy "hh members" on public.planned_meals for all
      using (household_id in (select public.my_household_ids()))
      with check (household_id in (select public.my_household_ids()))';
  else
    execute 'create policy "allow all" on public.planned_meals for all using (true) with check (true)';
  end if;
end $$;
