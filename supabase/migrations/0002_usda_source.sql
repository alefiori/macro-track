-- Add USDA FoodData Central as a second external food source.
--
-- 1. Allow 'usda' in the foods.source check.
-- 2. De-duplicate imported foods per (source, off_id) instead of off_id alone,
--    so an Open Food Facts code and a USDA fdcId can't collide as strings.

alter table public.foods
  drop constraint if exists foods_source_check;

alter table public.foods
  add constraint foods_source_check
  check (source in ('custom', 'openfoodfacts', 'usda'));

drop index if exists public.foods_off_id_unique;

create unique index if not exists foods_source_off_id_unique
  on public.foods (source, off_id)
  where off_id is not null;
