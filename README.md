# MacroTrack

A responsive daily macros tracker built with **React + Vite + TypeScript**,
**Tailwind CSS**, and **Supabase** (Postgres + Auth). Set per-weekday macro
targets, log foods against them, and watch your daily carbs / protein / fats
fill up. Food data comes from your own custom foods plus the free
[Open Food Facts](https://world.openfoodfacts.org) database.

The UI is a faithful port of the Google Stitch design export in
[`design/stitch_macrotrack_health_dashboard/`](design/stitch_macrotrack_health_dashboard/) —
colors, typography, spacing, radii, and components are taken from `DESIGN.md`
and the per-screen `code.html` files.

## Features

- **Email/password auth** (sign up, sign in, sign out, forgot password) with a
  persisted session; all app routes are gated behind an auth guard.
- **My Targets** — per-weekday carbs/protein/fats goals with live calorie totals
  and "copy one day to all days".
- **Daily Tracker** — date selector, three macro progress rings (consumed vs.
  target + remaining), foods grouped by meal with inline edit/delete, and a
  calorie summary.
- **Add Food** — debounced search merging your own foods with live Open Food
  Facts results; pick a meal, adjust servings, and log.
- **Create Custom Food** — name, serving, per-serving macros with live calorie
  calc, plus "save & add to today".
- **My Foods** — manage your custom and imported foods.

## Tech stack

| Concern    | Choice                                  |
| ---------- | --------------------------------------- |
| Build      | Vite + React 18 + TypeScript            |
| Styling    | Tailwind CSS (via PostCSS, not the CDN) |
| Routing    | React Router v6                         |
| Backend    | Supabase (Postgres + Auth + RLS)        |
| Food data  | Open Food Facts API (v2 / cgi search)   |

## Getting started

### 1. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) and create a new project.
2. Once it's provisioned, open **Settings → API** and note the
   **Project URL** and the **anon/public** API key.

### 2. Run the database migration

The schema (tables + row-level security) lives in
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

**Option A — Supabase SQL Editor (quickest):** open the SQL Editor in the
dashboard, paste the contents of `0001_init.sql`, and run it.

**Option B — Supabase CLI:**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates `macro_targets`, `foods`, and `food_logs`, enables RLS, and adds
policies so each user can only read/write their own rows (global foods with a
null `user_id` are readable by everyone).

### 3. Configure environment variables

```bash
cp .env.example .env
```

Then fill in `.env` with your project's values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

`.env` is gitignored — never commit secrets. The anon key is safe to ship in a
client bundle; RLS is what protects your data.

> **Email confirmation:** by default Supabase requires email confirmation on
> sign-up. For local testing you can disable it under
> **Authentication → Providers → Email** so new accounts can sign in
> immediately.

### 4. Install and run

```bash
npm install
npm run dev
```

Open the printed local URL (default <http://localhost:5173>).

Other scripts:

```bash
npm run build      # type-check + production build
npm run preview    # preview the production build
```

## How Open Food Facts data is modeled

OFF nutriments are reported **per 100 g**. When a search result is logged, the
app normalizes it to a single serving (using the product's `serving_quantity`
when available, otherwise 100 g) and **upserts** it into `foods` with
`source='openfoodfacts'`, `off_id=<barcode/code>`, and `is_custom=false` —
de-duplicating on `off_id` — before inserting the `food_logs` row. Logs always
reference a stable local food. Results missing carbohydrate/protein/fat data are
skipped. All math (4/4/9 kcal per gram, per-serving scaling, per-100g
conversion, remaining-vs-target, ring offsets) lives in
[`src/lib/macros.ts`](src/lib/macros.ts).

## Project structure

```
src/
  components/   # layout, UI primitives, Add Food modal
  context/      # AuthContext, AppShellContext
  hooks/        # useFoodLogs, useTargets, useFoodSearch, useDebounce
  lib/          # supabase client, macros math, Open Food Facts, types
  pages/        # Auth, Dashboard, Targets, MyFoods, CreateCustomFood, Profile
supabase/
  migrations/   # SQL schema + RLS
```

## Credits

Food data is provided by **[Open Food Facts](https://world.openfoodfacts.org)**,
a collaborative, free and open database of food products from around the world.
Open Food Facts data is made available under the
[Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/).
Requests identify this app via a descriptive `User-Agent` as OFF requests.
