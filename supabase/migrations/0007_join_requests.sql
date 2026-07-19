-- MealMates schema — v7
-- Admin-approved joins (FPL-league style): a household has an owner (admin),
-- and joining goes through a request the admin approves or denies. Safe to
-- run on top of 0001–0006.

-- Household owner / admin.
alter table public.households
  add column if not exists owner_member_id text;

-- ---------- join_requests ----------
create table if not exists public.join_requests (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  name text not null,
  emoji text not null default '🙂',
  color text not null default '#C4704F',
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  member_id text,               -- set to the created member's id on approval
  created_at timestamptz not null default now()
);
create index if not exists idx_join_requests_hh on public.join_requests(household_id);
create index if not exists idx_join_requests_status on public.join_requests(status);

-- ---------- Realtime + permissive RLS ----------
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.join_requests';
  exception when duplicate_object then null;
  end;
end $$;

alter table public.join_requests enable row level security;
drop policy if exists "allow all" on public.join_requests;
create policy "allow all" on public.join_requests
  for all using (true) with check (true);
