-- 0002_provisioning_and_terms.sql
--
-- Adds the pieces needed for:
--   - forcing a password change on first login for temp-password accounts
--   - a terms-of-service acceptance record for engineers
--   - engineer profile-completion fields (working hours, ID + insurance
--     documents) that both FixFlow and Portal read/write from the same
--     source of truth, so a nudge on one side disappears once the other
--     side has filled it in.
--
-- Run this whole file once in Supabase Dashboard -> SQL Editor, same as
-- 0001_identity.sql.

-- ─── forced password change ────────────────────────────────────────────────
-- Set to true whenever an account is created with a staff-set temporary
-- password (see the create-user Edge Function). Both apps check this right
-- after a successful sign-in and, if true, force a "set your own password"
-- screen before anything else -- cleared the moment they do that.
alter table public.profiles add column if not exists must_change_password boolean not null default false;

-- ─── terms of service (engineers only, for now) ───────────────────────────
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists terms_version text;

-- ─── engineer profile completion ──────────────────────────────────────────
-- Working hours: a simple day -> {start,end,off} map, e.g.
--   {"mon":{"start":"09:00","end":"17:00","off":false}, "sat":{"off":true}, ...}
alter table public.engineers add column if not exists working_hours jsonb not null default '{}'::jsonb;

-- Document uploads live in the "engineer-documents" Storage bucket (created
-- below), one private folder per engineer keyed by their profile id
-- (auth.uid()). These columns just point at the uploaded file and record
-- when it happened; the actual bytes live in Storage, not the database.
alter table public.engineers add column if not exists id_document_path text;
alter table public.engineers add column if not exists id_document_uploaded_at timestamptz;
alter table public.engineers add column if not exists insurance_document_path text;
alter table public.engineers add column if not exists insurance_document_uploaded_at timestamptz;
alter table public.engineers add column if not exists insurance_expiry_date date;

-- ─── storage bucket for ID / insurance documents ──────────────────────────
insert into storage.buckets (id, name, public)
values ('engineer-documents', 'engineer-documents', false)
on conflict (id) do nothing;

-- Each engineer's files live under a folder named after their own profile
-- id (auth.uid()), e.g. "<uuid>/id-document.pdf" -- enforced by the CHECK
-- below rather than trusted from the client.
drop policy if exists "engineer docs: self can manage own folder" on storage.objects;
create policy "engineer docs: self can manage own folder"
  on storage.objects for all
  using (bucket_id = 'engineer-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'engineer-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Staff/owner can manage (not just view) any engineer's documents too --
-- FixFlow's Engineer Editor lets staff upload these on an engineer's behalf,
-- which is exactly what keeps the two apps' profile-completion checks in
-- sync regardless of which side actually did the uploading.
drop policy if exists "engineer docs: staff/owner can read all" on storage.objects;
drop policy if exists "engineer docs: staff/owner can manage all" on storage.objects;
create policy "engineer docs: staff/owner can manage all"
  on storage.objects for all
  using (bucket_id = 'engineer-documents' and public.is_staff_or_owner())
  with check (bucket_id = 'engineer-documents' and public.is_staff_or_owner());
