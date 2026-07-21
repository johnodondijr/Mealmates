-- MealMates schema — v11
-- Per-member "don't suggest this exact combo to me again". Scoped to the
-- household; personal to each member. Safe to re-run. Works whether or not the
-- strict RLS from 0009 has been applied — it picks the matching policy.

create table if not exists public.combo_dislikes (
  id text primary key,
  household_id text references public.households(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  signature text not null,
  created_at timestamptz not null default now(),
  unique (member_id, signature)
);
create index if not exists idx_combo_dislikes_hh on public.combo_dislikes(household_id);

-- Realtime
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.combo_dislikes';
  exception when duplicate_object then null;
  end;
end $$;

-- RLS — household-scoped if my_household_ids() exists (strict setup), else the
-- permissive "allow all" used by the baseline schema.
alter table public.combo_dislikes enable row level security;
drop policy if exists "allow all" on public.combo_dislikes;
drop policy if exists "hh members" on public.combo_dislikes;
do $$
begin
  if exists (
    select 1 from pg_proc where proname = 'my_household_ids' and pronamespace = 'public'::regnamespace
  ) then
    execute 'create policy "hh members" on public.combo_dislikes for all
      using (household_id in (select public.my_household_ids()))
      with check (household_id in (select public.my_household_ids()))';
  else
    execute 'create policy "allow all" on public.combo_dislikes for all using (true) with check (true)';
  end if;
end $$;
