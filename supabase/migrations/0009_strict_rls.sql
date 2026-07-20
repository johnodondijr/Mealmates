-- MealMates schema — v9  (HARD ISOLATION — opt in when ready)
-- =============================================================================
-- Replaces the permissive "allow all" policies with row-level security that
-- locks every household's data to its own members (identified by their
-- Supabase Auth user id). APPLY THIS ONLY AFTER:
--   1. Anonymous sign-ins are enabled in your project
--      (Authentication → Sign In / Providers → Anonymous → on), AND
--   2. Everyone who should have access has (re)created or (re)joined their
--      household on a build with auth — so their member row has an auth_id.
-- Members whose auth_id is null will lose access once this runs. Test with a
-- second device before relying on it. To revert, run the rollback block at the
-- bottom of this file.
-- =============================================================================

-- Which households the current auth user belongs to. SECURITY DEFINER so it
-- bypasses RLS on members (avoids infinite policy recursion).
create or replace function public.my_household_ids()
returns setof text
language sql
security definer
stable
set search_path = public
as $$
  select household_id from public.members where auth_id = auth.uid()
$$;
grant execute on function public.my_household_ids() to anon, authenticated;

-- Helper to drop every existing policy on a table before adding the strict one.
do $$
declare
  r record;
  hh_tables text[] := array[
    'food_preferences','meal_wishes','votes','vote_options',
    'vote_ballots','meals_eaten','expenses'
  ];
  t text;
begin
  -- Clear all existing policies on the tables we manage.
  for t in select unnest(hh_tables || array['households','members','join_requests','foods'])
  loop
    for r in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- Household-scoped tables: only rows in a household you belong to.
  foreach t in array hh_tables loop
    execute format(
      'create policy "hh members" on public.%I for all
         using (household_id in (select public.my_household_ids()))
         with check (household_id in (select public.my_household_ids()))', t);
  end loop;
end $$;

-- households: read the ones you belong to; any signed-in user may look one up
-- by code (needed to request a join) and create a new one.
create policy "hh read own" on public.households
  for select using (id in (select public.my_household_ids()) or auth.uid() is not null);
create policy "hh insert" on public.households
  for insert with check (auth.uid() is not null);
create policy "hh update own" on public.households
  for update using (id in (select public.my_household_ids()));

-- members: read your households' members; insert yourself (on create) or, as an
-- admin, members of your household (on approval); update/delete your household's.
create policy "member read" on public.members
  for select using (household_id in (select public.my_household_ids()));
create policy "member insert" on public.members
  for insert with check (
    auth_id = auth.uid() or household_id in (select public.my_household_ids())
  );
create policy "member modify" on public.members
  for update using (household_id in (select public.my_household_ids()));
create policy "member delete" on public.members
  for delete using (household_id in (select public.my_household_ids()));

-- join_requests: file your own; read your own or (as admin) your household's;
-- admins update (approve/deny).
create policy "req insert" on public.join_requests
  for insert with check (requester_auth_id = auth.uid());
create policy "req read" on public.join_requests
  for select using (
    requester_auth_id = auth.uid() or household_id in (select public.my_household_ids())
  );
create policy "req update" on public.join_requests
  for update using (household_id in (select public.my_household_ids()));

-- foods: shared catalog, readable/editable by any signed-in user.
create policy "foods all" on public.foods
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- =============================================================================
-- ROLLBACK — restore the permissive policies (paste + run to undo the above):
-- =============================================================================
-- do $$
-- declare t text; r record;
-- begin
--   foreach t in array array['households','members','foods','food_preferences',
--     'meal_wishes','votes','vote_options','vote_ballots','meals_eaten',
--     'expenses','join_requests'] loop
--     for r in select policyname from pg_policies
--              where schemaname='public' and tablename=t loop
--       execute format('drop policy if exists %I on public.%I', r.policyname, t);
--     end loop;
--     execute format('create policy "allow all" on public.%I for all using (true) with check (true)', t);
--   end loop;
-- end $$;
