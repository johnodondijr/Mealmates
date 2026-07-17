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
2. Open **SQL Editor** and run the migration:
   `supabase/migrations/0001_init.sql`
   (This creates every table, adds them to the `supabase_realtime`
   publication, and sets permissive RLS for a single trusted household.)
3. Copy `.env.example` to `.env` and fill in your project's values
   (Supabase dashboard → **Settings → API**):

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Restart `npm run dev`. On first connect the empty database is seeded
   automatically. Settings → Data will show **"Supabase (live sync)"**.

> Using the Supabase CLI instead? `supabase db push` will apply the migration
> in `supabase/migrations/`.

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
