-- 0004_external_engineers.sql
--
-- Supports assigning a one-off "external" engineer to a booking, for when a
-- job comes in somewhere Easy Repair doesn't have an in-house engineer
-- covering that postcode. Rather than creating a full engineers/profiles
-- row (which would mean a portal login, postcode coverage, appliance
-- skills, working hours, document uploads, onboarding, etc. -- all
-- meaningless for someone doing a single job), the external engineer's
-- contact details are stored directly on the booking itself.
--
-- Like 0003_bookings_delete_policy.sql, the `bookings` table itself
-- predates the committed migration history, so this only adds the new
-- columns -- existing select/insert/update policies on `bookings` already
-- cover them since they aren't column-scoped.
--
-- Run this once in Supabase Dashboard -> SQL Editor, same as 0001-0003.
-- If a migration numbered 0004 already exists in your project's history
-- (e.g. an uncommitted "realtime" migration), just rename this file to the
-- next free number -- the numbering is informational only.

alter table public.bookings add column if not exists is_external boolean not null default false;
alter table public.bookings add column if not exists external_engineer_name text;
alter table public.bookings add column if not exists external_engineer_phone text;
alter table public.bookings add column if not exists external_engineer_email text;
alter table public.bookings add column if not exists external_engineer_company text;

-- A booking should never claim to be both assigned to an in-house engineer
-- AND an external one at the same time.
alter table public.bookings drop constraint if exists bookings_not_both_engineer_types;
alter table public.bookings add constraint bookings_not_both_engineer_types
  check (not (is_external and engineer_id is not null));

-- An external booking without a name would just show as a blank "assigned"
-- job with nothing to identify who's actually doing it.
alter table public.bookings drop constraint if exists bookings_external_needs_name;
alter table public.bookings add constraint bookings_external_needs_name
  check (not is_external or coalesce(external_engineer_name, '') <> '');
