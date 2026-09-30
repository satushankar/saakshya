-- Saakshya prototype schema (TRD §8). Paste into the Supabase SQL editor and run once.
-- RLS POSTURE: permissive anon policies. This is NOT production security.
-- A real deployment needs authenticated officers, per-device write scoping,
-- and role-gated read access.

create table if not exists officers (
  id text primary key,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists devices (
  id text primary key,
  officer_id text references officers(id),
  public_key text not null,
  registered_at timestamptz default now()
);

create table if not exists reagents (
  key text primary key,
  name text not null,
  reference_patches jsonb not null
);

create table if not exists records (
  id uuid primary key,
  case_number text not null,
  reagent text references reagents(key),
  operator_id text references officers(id),
  device_id text references devices(id),
  captured_at timestamptz not null,
  gps jsonb,
  image_sha256 text not null,
  image_path text not null,
  measurement jsonb not null,
  verdict text not null,
  verdict_reason text not null,
  officer_decision text,
  officer_note text,
  prev_hash text not null,
  record_hash text not null unique,
  signature text not null,
  public_key text not null,
  synced_at timestamptz default now()
);

create index if not exists records_case_number_idx on records (case_number);
create index if not exists records_device_synced_idx on records (device_id, synced_at);

-- captured_at is sealed as an exact ISO string. Store it verbatim too, so verification
-- after a round trip through Postgres uses the identical bytes that were signed.
alter table records add column if not exists captured_at_sealed text;

-- Seed reagents. Every reagent is read against the same printed five-patch strip.
-- Colours are design-grade representations of documented reactions, NOT
-- spectrophotometric measurements. Replace with values measured from the printed card.
insert into reagents (key, name, reference_patches) values
  ('marquis', 'Marquis', '[{"key":"blank-amber","substance":"no reaction","hex":"#E0C877"},{"key":"amphet-orange","substance":"amphetamine-type","hex":"#D4631F"},{"key":"scott-blue","substance":"cocaine","hex":"#2D6CB8"},{"key":"marquis-purple","substance":"opiates","hex":"#7B34A6"},{"key":"reaction-black","substance":"MDMA-type / strong","hex":"#241029"}]'),
  ('mecke',   'Mecke',   '[{"key":"blank-amber","substance":"no reaction","hex":"#E0C877"},{"key":"amphet-orange","substance":"amphetamine-type","hex":"#D4631F"},{"key":"scott-blue","substance":"cocaine","hex":"#2D6CB8"},{"key":"marquis-purple","substance":"opiates","hex":"#7B34A6"},{"key":"reaction-black","substance":"MDMA-type / strong","hex":"#241029"}]'),
  ('scott',   'Scott',   '[{"key":"blank-amber","substance":"no reaction","hex":"#E0C877"},{"key":"amphet-orange","substance":"amphetamine-type","hex":"#D4631F"},{"key":"scott-blue","substance":"cocaine","hex":"#2D6CB8"},{"key":"marquis-purple","substance":"opiates","hex":"#7B34A6"},{"key":"reaction-black","substance":"MDMA-type / strong","hex":"#241029"}]')
on conflict (key) do nothing;

-- Permissive prototype policies (anon key).
alter table officers enable row level security;
alter table devices  enable row level security;
alter table reagents enable row level security;
alter table records  enable row level security;

create policy "proto read officers"  on officers for select using (true);
create policy "proto write officers" on officers for insert with check (true);
create policy "proto upsert officers" on officers for update using (true);
create policy "proto read devices"   on devices  for select using (true);
create policy "proto write devices"  on devices  for insert with check (true);
create policy "proto upsert devices" on devices  for update using (true);
create policy "proto read reagents"  on reagents for select using (true);
create policy "proto read records"   on records  for select using (true);
create policy "proto insert records" on records  for insert with check (true);
-- Deliberately no update/delete policy on records: sealed records are immutable.

-- Storage bucket for test images.
insert into storage.buckets (id, name, public) values ('test-images', 'test-images', false)
on conflict (id) do nothing;

create policy "proto read images"   on storage.objects for select using (bucket_id = 'test-images');
create policy "proto upload images" on storage.objects for insert with check (bucket_id = 'test-images');
-- Update allowed only so the dev tamper demo can overwrite an image. Remove for any real use.
create policy "proto tamper images" on storage.objects for update using (bucket_id = 'test-images');
