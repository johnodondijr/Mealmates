-- MealMates schema — v8
-- Groundwork for hard isolation (Supabase Auth) and email notifications.
-- Backward-compatible: columns are nullable and permissive RLS still applies,
-- so the app keeps working before the strict policies in 0009 are enabled.

-- Link a member / join-request to a Supabase Auth user (anonymous sign-in).
alter table public.members       add column if not exists auth_id text;
alter table public.join_requests add column if not exists requester_auth_id text;
create index if not exists idx_members_auth on public.members(auth_id);

-- Admin email so an Edge Function can notify them of join requests.
alter table public.households    add column if not exists admin_email text;
