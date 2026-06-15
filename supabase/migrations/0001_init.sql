-- MacroTrack initial schema
-- Three tables (macro_targets, foods, food_logs) with row-level security so
-- users can only access their own rows (auth.uid() = user_id). Global foods
-- (user_id IS NULL) are readable by everyone.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- macro_targets: per-weekday macro goals
-- ---------------------------------------------------------------------------
create table if not exists public.macro_targets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  day_of_week int  not null check (day_of_week between 0 and 6),
  carbs_g     numeric not null default 0 check (carbs_g >= 0),
  protein_g   numeric not null default 0 check (protein_g >= 0),
  fats_g      numeric not null default 0 check (fats_g >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, day_of_week)
);

create trigger macro_targets_set_updated_at
  before update on public.macro_targets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- foods: custom + imported (Open Food Facts) foods. Macros are per serving.
-- user_id is nullable so global foods can exist.
-- ---------------------------------------------------------------------------
create table if not exists public.foods (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users (id) on delete cascade,
  name           text not null,
  brand          text,
  serving_amount numeric not null default 1 check (serving_amount > 0),
  serving_unit   text not null default 'serving',
  carbs_g        numeric not null default 0 check (carbs_g >= 0),
  protein_g      numeric not null default 0 check (protein_g >= 0),
  fats_g         numeric not null default 0 check (fats_g >= 0),
  source         text not null default 'custom' check (source in ('custom', 'openfoodfacts')),
  off_id         text,
  is_custom      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- De-duplicate imported foods by their Open Food Facts code.
create unique index if not exists foods_off_id_unique
  on public.foods (off_id)
  where off_id is not null;

create index if not exists foods_user_id_idx on public.foods (user_id);
create index if not exists foods_name_idx on public.foods using gin (to_tsvector('simple', name));

-- ---------------------------------------------------------------------------
-- food_logs: a food logged on a date/meal with a serving multiplier
-- ---------------------------------------------------------------------------
create table if not exists public.food_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  food_id    uuid not null references public.foods (id) on delete cascade,
  log_date   date not null default current_date,
  meal       text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  servings   numeric not null default 1 check (servings > 0),
  created_at timestamptz not null default now()
);

create index if not exists food_logs_user_date_idx on public.food_logs (user_id, log_date);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.macro_targets enable row level security;
alter table public.foods enable row level security;
alter table public.food_logs enable row level security;

-- macro_targets: owner-only
create policy "macro_targets owner select" on public.macro_targets
  for select using (auth.uid() = user_id);
create policy "macro_targets owner insert" on public.macro_targets
  for insert with check (auth.uid() = user_id);
create policy "macro_targets owner update" on public.macro_targets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "macro_targets owner delete" on public.macro_targets
  for delete using (auth.uid() = user_id);

-- foods: read own + global; write own only
create policy "foods read own or global" on public.foods
  for select using (auth.uid() = user_id or user_id is null);
create policy "foods owner insert" on public.foods
  for insert with check (auth.uid() = user_id);
create policy "foods owner update" on public.foods
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "foods owner delete" on public.foods
  for delete using (auth.uid() = user_id);

-- food_logs: owner-only
create policy "food_logs owner select" on public.food_logs
  for select using (auth.uid() = user_id);
create policy "food_logs owner insert" on public.food_logs
  for insert with check (auth.uid() = user_id);
create policy "food_logs owner update" on public.food_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "food_logs owner delete" on public.food_logs
  for delete using (auth.uid() = user_id);
