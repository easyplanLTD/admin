-- 0001_identity.sql
--
-- Real identity/auth backbone for FixFlow (admin.easyrepair.co.uk) and
-- Portal (portal.easyrepair.co.uk). Both apps share this one Supabase
-- project. Run this whole file once in Supabase Dashboard -> SQL Editor.
--
-- What this creates:
--   - profiles        one row per auth.users row, holds role + basic identity
--   - engineers        one row per engineer profile, holds engineer-only fields
--   - a trigger that auto-creates a profiles row whenever a new auth user is
--     created (via the create-user Edge Function, invite or password both
--     go through auth.users so this always fires)
--   - RLS policies so:
--       * owners/staff can see and manage every profile/engineer
--       * an engineer can see and manage only their own two rows
--   - no INSERT policies for engineers via anon/authenticated roles: account
--     creation always goes through the create-user Edge Function using the
--     service_role key, which bypasses RLS entirely.

-- ─── profiles ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner','staff','engineer')),
  name       text not null default '',
  email      text not null default '',
  phone      text not null default '',
  avatar     text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper: is the current logged-in user an owner or staff member?
-- SECURITY DEFINER + a fixed search_path so it can be safely used inside
-- RLS policies (it reads profiles itself, so it must bypass the RLS it's
-- used inside of, otherwise it'd recurse into itself).
create or replace function public.is_staff_or_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner','staff')
  );
$$;

create policy "profiles: staff/owner can read all"
  on public.profiles for select
  using (public.is_staff_or_owner());

create policy "profiles: staff/owner can update all"
  on public.profiles for update
  using (public.is_staff_or_owner());

create policy "profiles: self read"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: self update"
  on public.profiles for update
  using (id = auth.uid());

-- ─── engineers ───────────────────────────────────────────────────────────
create table if not exists public.engineers (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null unique references public.profiles(id) on delete cascade,
  pay_rate             numeric not null default 45,
  postcodes            text[] not null default '{}',
  appliance_types      text[] not null default '{}',
  brand_exclusions     jsonb not null default '{}'::jsonb,
  self_service_enabled boolean not null default false,
  stats_completed      int not null default 0,
  stats_ber            int not null default 0,
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);

alter table public.engineers enable row level security;

create policy "engineers: staff/owner can read all"
  on public.engineers for select
  using (public.is_staff_or_owner());

create policy "engineers: staff/owner can update all"
  on public.engineers for update
  using (public.is_staff_or_owner());

create policy "engineers: self read"
  on public.engineers for select
  using (profile_id = auth.uid());

create policy "engineers: self update own settings"
  on public.engineers for update
  using (profile_id = auth.uid() and self_service_enabled = true);

-- ─── auto-create profile row on signup ──────────────────────────────────
-- Both auth.admin.inviteUserByEmail and auth.admin.createUser (used by the
-- create-user Edge Function) insert into auth.users with the metadata we
-- pass as user_metadata, available here as raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'engineer'),
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
