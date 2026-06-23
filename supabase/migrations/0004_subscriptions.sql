-- Per-user subscription / plan state.
--
-- Drives the free vs. premium split: the only product difference is that the
-- free plan shows ads and premium removes them. One row per auth user.
--
-- SECURITY NOTE: users may only SELECT their own row — there is deliberately NO
-- insert/update policy, so the plan column cannot be flipped from the browser.
-- Only the Stripe webhook (running with the service-role key, which bypasses
-- RLS) ever writes plan/status. The signup trigger and backfill below seed a
-- 'free' row via SECURITY DEFINER, also bypassing RLS.

create table if not exists public.subscriptions (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  plan               text not null default 'free' check (plan in ('free', 'premium')),
  -- Raw Stripe subscription status (active, trialing, past_due, canceled, …),
  -- null while the user has never started a checkout.
  status             text,
  stripe_customer_id text,
  stripe_subscription_id text,
  -- End of the current paid period; premium access can be honored until then
  -- even after a cancellation.
  current_period_end timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed a 'free' subscription row whenever a new auth user is created. We extend
-- the existing handle_new_user() trigger function (defined in 0003) rather than
-- adding a second trigger on auth.users.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  insert into public.subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Backfill a free row for every existing user.
insert into public.subscriptions (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security: owner may read only. No write policies (see note above).
-- ---------------------------------------------------------------------------
alter table public.subscriptions enable row level security;

create policy "subscriptions owner select" on public.subscriptions
  for select using (auth.uid() = user_id);
