-- Community foods: let users publish their own custom foods so everyone can
-- find and reuse them.
--
-- 1. Add foods.is_public (default false — foods stay private until shared).
-- 2. Widen the read policy so any authenticated user can read public foods,
--    in addition to their own and legacy global (user_id is null) rows.
-- 3. Index is_public for community searches.
--
-- Toggling is_public needs no new write policy: the existing owner-only UPDATE
-- policy already lets a user share/unshare their own foods, and attribution is
-- preserved (user_id is not nulled), so publishers keep edit/delete rights.

alter table public.foods
  add column if not exists is_public boolean not null default false;

drop policy if exists "foods read own or global" on public.foods;

create policy "foods read own, global or public" on public.foods
  for select using (auth.uid() = user_id or user_id is null or is_public);

create index if not exists foods_is_public_idx
  on public.foods (is_public)
  where is_public;
