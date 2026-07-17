-- MealMates schema — v2
-- Adds: per-food "suggestable" flag + ingredient breakdown, itemised meal
-- costs, and per-person "I want this today" picks (meal_wishes).
-- Safe to run on top of 0001 (idempotent where possible).

-- ---------- foods: suggestable + ingredients ----------
alter table public.foods
  add column if not exists suggestable boolean not null default true;
alter table public.foods
  add column if not exists ingredients jsonb not null default '[]'::jsonb;

-- ---------- meals_eaten: itemised actual costs ----------
alter table public.meals_eaten
  add column if not exists component_costs jsonb not null default '[]'::jsonb;

-- ---------- meal_wishes: "I want to eat this today" ----------
create table if not exists public.meal_wishes (
  id text primary key,
  member_id text not null references public.members(id) on delete cascade,
  food_id text not null references public.foods(id) on delete cascade,
  wished_on date not null default current_date,
  unique (member_id, food_id, wished_on)
);
create index if not exists idx_wishes_day on public.meal_wishes(wished_on);

-- ---------- Realtime + RLS for the new table ----------
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.meal_wishes';
  exception when duplicate_object then null;
  end;
end $$;

alter table public.meal_wishes enable row level security;
drop policy if exists "allow all" on public.meal_wishes;
create policy "allow all" on public.meal_wishes
  for all using (true) with check (true);
