-- Add Edamam (Food Database API) as a third external food source.
--
-- Imported Edamam foods are de-duplicated per (source, off_id) by the existing
-- foods_source_off_id_unique index from 0002, so only the source check needs
-- to change.

alter table public.foods
  drop constraint if exists foods_source_check;

alter table public.foods
  add constraint foods_source_check
  check (source in ('custom', 'openfoodfacts', 'usda', 'edamam'));
