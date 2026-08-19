-- 0003_bookings_delete_policy.sql
--
-- Adds the ability to permanently delete a booking from FixFlow (the
-- "Delete Booking" button on a job's detail view). The `bookings` table
-- itself isn't created by a migration in this repo (it predates the
-- committed migration history and was set up directly in the Supabase
-- SQL editor), so its existing select/insert/update policies aren't shown
-- here -- this file only adds the missing delete policy alongside them.
--
-- Run this once in Supabase Dashboard -> SQL Editor, same as 0001/0002.
-- If a migration numbered 0003 already exists in your project's history
-- (e.g. an uncommitted "archiving" or "pricing" migration), just rename
-- this file to the next free number -- the numbering is informational
-- only, nothing here depends on it.
--
-- Owner-only, matching the "Delete Forever" pattern already used for
-- engineers/users in the app (see permanentlyDeleteProfile in src/App.jsx):
-- deleting a booking is irreversible, unlike setting its status to
-- Cancelled, which keeps the record around. If you'd rather staff be able
-- to delete bookings too, swap `role = 'owner'` below for
-- `public.is_staff_or_owner()` (defined in 0001_identity.sql).

drop policy if exists "bookings: owner can delete" on public.bookings;
create policy "bookings: owner can delete"
  on public.bookings for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'owner'
    )
  );
