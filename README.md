# MealMates 🍲

A fun, insanely practical app that settles the daily **"what are we eating?"**
debate in a shared house. Built for four housemates in Nairobi — decide fast,
fair, and fun, while quietly tracking food spending and eating history so the
house gets smarter about meals over time.

Mobile-first, playful, and native-feeling. Pass one phone around or have
everyone vote on their own device — votes update live.

## ✨ Features

- **🎰 Decide** — a big "Decide for us" button plus a juicy slot-machine
  "Surprise Me" mode. Builds full combos (Base + Protein + Veg) with **smart
  ranking**: classic Kenyan pairings, recency penalties, household ❤️/🚫
  preferences, and a budget mode. Every suggestion shows cost (KES), effort,
  and _why_ it was picked. Confetti on landing.
- **🗳️ Vote** — start a Breakfast/Lunch/Dinner vote with engine-proposed
  candidates, vote live (Realtime), animated result bars, a dramatic
  **tie-breaker wheel**, and a **Chef's Favorite 👑 leaderboard**. Winners log
  to history automatically.
- **🍲 Foods** — pre-seeded library of Kenyan household foods by category. Add /
  edit / remove foods (emoji picker, cost, effort, prep time). Tag what each
  member loves ❤️ or refuses 🚫 — refused foods are flagged.
- **💸 Money** — log food spending, track a monthly budget, see per-person
  contributions, mini-Splitwise **settle-up** math, and charts (by week, by
  category, by person).
- **📊 Stats** — auto-logged meal history, most-eaten combos, "days since we
  last ate X", a 4-week frequency heatmap, and a shareable **Household Wrapped**
  recap card (exports a PNG straight to WhatsApp).
- One-tap **profile switcher**, **dark mode**, and `prefers-reduced-motion`
  support throughout.

## 🧱 Tech stack

- **Vite + React + TypeScript**
- **Tailwind CSS** (warm, appetizing palette)
- **Framer Motion** for animation
- **lucide-react** for icons
- **Supabase** (Postgres + Realtime) as the end-state datastore

### Data layer (repository pattern)

The UI talks to a `Repository` interface, never directly to a database. Two
adapters implement it:

- **`LocalRepository`** (default) — localStorage-backed, works with **zero
  setup**. Cross-tab/live updates use `BroadcastChannel` + storage events, so
  voting is live across tabs on one device out of the box.
- **`SupabaseRepository`** — the same contract backed by Supabase tables, with
  **Supabase Realtime** for live sync across devices.

The adapter is chosen automatically: if Supabase env vars are present it uses
Supabase, otherwise it falls back to local storage. Swapping in Supabase needs
**no UI changes**.

## 🚀 Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173. The app is fully seeded on first run (4 housemates,
Kenyan food library, sample meals & expenses) — no setup required.

```bash
npm run build     # type-check + production build
npm run preview   # preview the production build
```

## 🗄️ Enabling Supabase (optional — for live sync across devices)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run **`supabase/schema.sql`** (the whole file).
   This creates every table, adds them to the `supabase_realtime`
   publication, and sets permissive RLS for a single trusted household.
   (Prefer migrations? Run `supabase/migrations/0001`–`0004` in order — the
   end state is identical.)
3. Connect the app to your project — pick **one**:

   **A. In-app (no rebuild — works on the live GitHub Pages site):**
   open **⚙️ Settings → Sync across devices**, paste your project **URL**
   and **anon public key** (Supabase dashboard → **Settings → API**), and
   tap **Connect & sync**. The config is stored on the device and the app
   reloads against Supabase. Tap **Disconnect** anytime to go back to
   local-only.

   **B. Build-time env vars (for self-hosted builds):** copy `.env.example`
   to `.env` and fill in:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   then restart `npm run dev`.

After connecting you'll **create a household** (which makes you its **admin**
and gives you a short join code) or **ask to join** one with a code. One
Supabase project can host several isolated households — each only sees its
own members, meals, votes, wishes and spending. Share your code
(**Settings → Sync**) so housemates can request to join; the admin gets a
live **join-request** badge in the header and taps ✓/✗ to let them in
(FPL-league style). You'll also see who's **live** in real time (a green dot
on their avatar). The food catalog is shared across households; everything
else is scoped per household.

> Already ran an older `schema.sql`? Re-run the updated one (it's
> idempotent), or apply the newer migrations in order —
> `0005`…`0009`.

### 🔒 Hardening: true per-household isolation (optional)

By default the approval flow gates the *experience*; the shared anon key +
permissive RLS mean the data isn't locked at the database level. To enforce
real isolation, the app already signs each device in **anonymously** and
tags members/requests with that identity — you just enable it and switch on
strict policies:

1. In Supabase: **Authentication → Sign In / Providers → Anonymous sign-ins → enable.**
2. Make sure everyone who needs access has **created or (re)joined** their
   household on the live app (so their member row gets an `auth_id`). Members
   with no `auth_id` will lose access under strict rules.
3. Run **`supabase/migrations/0009_strict_rls.sql`** — it replaces "allow all"
   with policies scoped to `my_household_ids()`. **Test with a second device.**
   If anything locks up, run the **rollback block** at the bottom of that file
   to restore the permissive policies.

### ✉️ Email the admin on join requests (optional)

Get an email when someone asks to join, on top of the in-app badge:

1. Set your **alert email** in **Settings → Sync** (or when creating the
   household). It's stored on `households.admin_email`.
2. Grab a free API key from [resend.com](https://resend.com).
3. Deploy the function and set secrets (Supabase CLI):

   ```
   supabase functions deploy notify-join-request --no-verify-jwt
   supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL="MealMates <onboarding@resend.dev>"
   ```

4. In Supabase: **Database → Webhooks → Create** a webhook on
   `public.join_requests`, event **INSERT**, type **Supabase Edge Functions**
   → `notify-join-request`.

The function (`supabase/functions/notify-join-request/`) looks up the
household's admin email and sends the alert via Resend.

> Using the Supabase CLI instead? `supabase db push` will apply the
> migrations in `supabase/migrations/`.

> Note: switching a device from local-only to a synced household starts
> fresh in the cloud — existing on-device history isn't migrated up.

## ▲ Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Framework preset: **Vite** (auto-detected; `vercel.json` is included).
3. If using Supabase, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
   Environment Variables.
4. Deploy. Build command `npm run build`, output `dist`.

## 🗂️ Schema

`members`, `foods`, `food_preferences`, `votes`, `vote_options`,
`vote_ballots`, `meals_eaten`, `expenses`, `settings`. See
`supabase/migrations/0001_init.sql` and `src/types.ts`.

## 📁 Project structure

```
src/
  components/       reusable UI (SlotMachine, VoteCard, Confetti, editors, ui/…)
  data/             repository interface + local & supabase adapters + seed
  engine/           suggest.ts (combo scoring) · stats.ts (leaderboard, wrapped…)
  lib/              formatting, ids, share-image helpers
  screens/          Decide · Vote · Foods · Money · Stats · Settings
  store/            AppContext (state, actions, realtime) · ThemeContext
  types.ts          shared domain types
supabase/migrations/0001_init.sql
```

## ♻️ Resetting local data

Clear the `mealmates.data.v1` key in your browser's localStorage (DevTools →
Application → Local Storage) to wipe and re-seed.
