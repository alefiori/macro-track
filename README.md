# MacroTrack

A responsive daily macros tracker built with **React + Vite + TypeScript**,
**Tailwind CSS**, and **Supabase** (Postgres + Auth). Set per-weekday macro
targets, log foods against them, and watch your daily carbs / protein / fats
fill up. Food data comes from your own custom foods plus two free databases:
[Open Food Facts](https://world.openfoodfacts.org) and
[USDA FoodData Central](https://fdc.nal.usda.gov).

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
  Facts and USDA FoodData Central results (each tagged with its source); pick a
  meal, adjust servings, and log.
- **Create Custom Food** — name, serving, per-serving macros with live calorie
  calc, plus "save & add to today".
- **My Foods** — manage your custom and imported foods.

## Tech stack

| Concern    | Choice                                  |
| ---------- | --------------------------------------- |
| Build      | Vite + React 18 + TypeScript            |
| Styling    | Tailwind CSS (via PostCSS, not the CDN) |
| Routing    | React Router v6                         |
| Backend    | Supabase (Postgres + Auth + RLS + Edge Functions)       |
| Food data  | Open Food Facts + USDA FoodData Central (server-side proxy) |

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

### 3. Deploy the `food-search` Edge Function

All external food lookups (text search + barcode) run **server-side** in a
Supabase [Edge Function](supabase/functions/food-search), not from the browser.
This is required: Open Food Facts' modern search API
([Search-a-licious](https://search.openfoodfacts.org)) sends no CORS headers, so
browsers can't call it directly, and the USDA API key must not ship in the client
bundle. The function fans out to every source in parallel, normalizes results to a
shared shape, and de-duplicates them.

```bash
supabase functions deploy food-search --project-ref <your-project-ref>

# Optional: set the USDA key as a function secret (defaults to DEMO_KEY)
supabase secrets set USDA_API_KEY=your-fdc-api-key --project-ref <your-project-ref>
```

A free USDA key comes from the
[FoodData Central signup](https://fdc.nal.usda.gov/api-key-signup.html); without
it the function uses the shared `DEMO_KEY`, which works but is heavily
rate-limited (and may return 429s under load). Open Food Facts needs no key.

> **Until the function is deployed, food search and barcode lookup return
> nothing** — the client no longer calls the food APIs directly.

### 4. Configure environment variables

```bash
cp .env.example .env
```

Then fill in `.env` with your project's values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

No food-API keys live here — they're function secrets (see step 3), kept out of
the client bundle. `.env` is gitignored — never commit secrets. The anon key is
safe to ship in a client bundle; RLS is what protects your data.

> **Email confirmation:** by default Supabase requires email confirmation on
> sign-up. For local testing you can disable it under
> **Authentication → Providers → Email** so new accounts can sign in
> immediately.

### 5. Install and run

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

## How external food data is modeled

Both Open Food Facts and USDA FoodData Central report nutrients **per 100 g**, so
every imported food is stored on a fixed **100 g basis** (`serving_amount=100`,
`serving_unit='g'`) using the per-100g values directly — logging then works in
multiples of 100 g (1.5 servings = 150 g). When a search result is logged, the
app **upserts** it into `foods` with the appropriate `source`
(`'openfoodfacts'` or `'usda'`), `off_id=<the source's id>` (barcode/code for
OFF, `fdcId` for USDA), and `is_custom=false` — de-duplicating on
`(source, off_id)` — before inserting the `food_logs` row. Logs always reference
a stable local food. Results missing carbohydrate/protein/fat data are skipped.

Search ([`useFoodSearch`](src/hooks/useFoodSearch.ts)) queries the user's own
foods (locally, via Supabase) alongside a single call to the
[`food-search` Edge Function](supabase/functions/food-search/index.ts) through a
thin client ([`src/lib/foodApi.ts`](src/lib/foodApi.ts)). The function holds a
small registry of source adapters — currently Open Food Facts (via
Search-a-licious) and USDA — runs them in parallel, normalizes each to the shared
`ExternalFood` shape, and merges + de-duplicates across sources; a failing source
degrades gracefully to no results from that source. **Adding a new source**
(e.g. FatSecret, Nutritionix) is a server-side-only change: add an adapter to the
function's `SOURCES` array — no client or env changes needed. All math (4/4/9 kcal
per gram, per-serving scaling, per-100g conversion, remaining-vs-target, ring
offsets) lives in [`src/lib/macros.ts`](src/lib/macros.ts).

## Project structure

```
src/
  components/   # layout, UI primitives, Add Food modal
  context/      # AuthContext, AppShellContext
  hooks/        # useFoodLogs, useTargets, useFoodSearch, useDebounce
  lib/          # supabase client, macros math, foodApi (Edge Function client), types
  pages/        # Auth, Dashboard, Targets, MyFoods, CreateCustomFood, Profile
supabase/
  functions/    # food-search Edge Function (external food data proxy)
  migrations/   # SQL schema + RLS
```

## Credits

Food data is provided by:

- **[Open Food Facts](https://world.openfoodfacts.org)** — a collaborative,
  free and open database of food products from around the world, made available
  under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/).
  Requests identify this app via a descriptive `User-Agent`, as OFF requests.
- **[USDA FoodData Central](https://fdc.nal.usda.gov)** — U.S. Department of
  Agriculture, Agricultural Research Service. FoodData Central data is in the
  public domain.
