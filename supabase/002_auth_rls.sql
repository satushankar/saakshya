-- Saakshya 002: replace the permissive prototype policies with officer-scoped access.
-- Run once in the Supabase SQL editor, after schema.sql.
--
-- The anon key ships in the browser bundle by design. After this migration it grants
-- nothing on its own: every read and write requires a signed-in officer, and each
-- officer can only touch their own devices, records and images.
--
-- Also do in the dashboard: Authentication → Sign In / Providers → Email: disable
-- "Allow new users to sign up". Officer accounts are created by an administrator.

-- 1. Link officers to auth users.
alter table officers add column if not exists auth_uid uuid unique references auth.users(id) on delete set null;

-- 2. A device id must be derived from its own public key: first 16 hex of sha256(key).
alter table devices drop constraint if exists devices_id_matches_key;
alter table devices add constraint devices_id_matches_key
  check (id = left(encode(extensions.digest(decode(public_key, 'base64'), 'sha256'), 'hex'), 16));

-- Helper: the officer id of the signed-in user (null when anonymous).
create or replace function public.current_officer_id() returns text
  language sql stable security definer set search_path = public as $$
  select id from officers where auth_uid = auth.uid()
$$;
revoke all on function public.current_officer_id() from public, anon;
grant execute on function public.current_officer_id() to authenticated;

-- 3. Drop every prototype policy.
drop policy if exists "proto read officers"   on officers;
drop policy if exists "proto write officers"  on officers;
drop policy if exists "proto upsert officers" on officers;
drop policy if exists "proto read devices"    on devices;
drop policy if exists "proto write devices"   on devices;
drop policy if exists "proto upsert devices"  on devices;
drop policy if exists "proto read reagents"   on reagents;
drop policy if exists "proto read records"    on records;
drop policy if exists "proto insert records"  on records;
drop policy if exists "proto read images"     on storage.objects;
drop policy if exists "proto upload images"   on storage.objects;
drop policy if exists "proto tamper images"   on storage.objects;

-- Belt and braces: the anon role has no table privileges at all.
revoke all on officers, devices, reagents, records from anon;

-- 4. Officer-scoped policies. No update or delete anywhere: sealed data is immutable.
create policy "officer reads self" on officers for select to authenticated
  using (auth_uid = auth.uid());

create policy "officer reads own devices" on devices for select to authenticated
  using (officer_id = current_officer_id());
create policy "officer registers own device" on devices for insert to authenticated
  with check (officer_id = current_officer_id());

create policy "officers read reagents" on reagents for select to authenticated
  using (true);

create policy "officer reads own records" on records for select to authenticated
  using (operator_id = current_officer_id());
create policy "officer inserts from own device" on records for insert to authenticated
  with check (
    operator_id = current_officer_id()
    and exists (
      select 1 from devices d
      where d.id = records.device_id
        and d.officer_id = current_officer_id()
        and d.public_key = records.public_key
    )
  );

-- Images live at {device_id}/{record_id}.png; only the owning officer's devices.
create policy "officer reads own images" on storage.objects for select to authenticated
  using (
    bucket_id = 'test-images'
    and (storage.foldername(name))[1] in (select id from devices where officer_id = current_officer_id())
  );
create policy "officer uploads own images" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'test-images'
    and (storage.foldername(name))[1] in (select id from devices where officer_id = current_officer_id())
  );

-- 5. Provision an officer (repeat per officer). First create the auth user in the
--    dashboard (Authentication → Users → Add user, auto-confirm), then:
--
-- insert into officers (id, name, auth_uid)
-- select 'NCB-4417', 'Officer name', id from auth.users where email = 'officer@example.org'
-- on conflict (id) do update set auth_uid = excluded.auth_uid;
