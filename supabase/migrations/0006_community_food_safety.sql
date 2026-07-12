-- Make it safe for a food_log to point directly at another user's shared food.
--
-- Logging a community food sets food_logs.food_id to a row owned by someone
-- else. Two hazards follow from that; both are fixed here.
--
-- 1. Unshare. When the owner flips is_public back to false the row stops being
--    readable by the users who logged it, so the dashboard's
--    `select('*, food:foods(*)')` join yields a null food and the row breaks.
--    Fix: a user can always read a food they have logged, shared or not.
--
-- 2. Delete. food_logs.food_id cascades, so an owner deleting a shared food
--    would silently delete *other people's* logs along with it.
--    Fix: block deleting a shared food that other users have logged. The owner
--    must unshare it instead (which is now harmless, per 1).

drop policy if exists "foods read own, global or public" on public.foods;

create policy "foods read own, global, public or logged" on public.foods
  for select using (
    auth.uid() = user_id
    or user_id is null
    or is_public
    or exists (
      select 1 from public.food_logs fl
      where fl.food_id = foods.id
        and fl.user_id = auth.uid()
    )
  );

-- Supports both the policy's lookup above and the delete guard below.
create index if not exists food_logs_food_id_idx on public.food_logs (food_id);

-- SECURITY DEFINER: the check must see *other* users' food_logs, which RLS
-- would otherwise hide from the user performing the delete.
create or replace function public.prevent_delete_shared_food_in_use()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_public and exists (
    select 1 from public.food_logs fl
    where fl.food_id = old.id
      and fl.user_id is distinct from old.user_id
  ) then
    raise exception 'shared_food_in_use'
      using hint = 'Unshare this food instead of deleting it.';
  end if;
  return old;
end;
$$;

drop trigger if exists foods_prevent_delete_shared_in_use on public.foods;

create trigger foods_prevent_delete_shared_in_use
  before delete on public.foods
  for each row execute function public.prevent_delete_shared_food_in_use();
