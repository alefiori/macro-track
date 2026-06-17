-- Per-user profile settings.
--
-- Currently holds the preferred Open Food Facts language (off_language), an
-- ISO 639-1 code used to localize OFF search/barcode results. Defaults to 'en'.
-- One row per auth user; rows are created automatically on signup and backfilled
-- for existing users below.

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  off_language text not null default 'en'
    check (off_language in ('en', 'it', 'fr', 'es', 'de', 'pt', 'nl')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user is created, and backfill
-- any users that already exist.
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security: owner-only.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles owner select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles owner insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles owner update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
