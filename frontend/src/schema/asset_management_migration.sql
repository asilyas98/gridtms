-- GridTMS Asset Management persistence migration
-- Run this once in Supabase SQL Editor before deploying the updated frontend.
-- It is safe to re-run: existing tables and columns are preserved.

create table if not exists public.tms_drivers (
  id text primary key,
  full_name text not null,
  phone text,
  email text,
  status text not null default 'Available',
  license_number text,
  cdl_state text,
  hos_available text,
  current_location text,
  cdl_class text,
  endorsements jsonb not null default '[]'::jsonb,
  score integer not null default 0,
  truck_id text,
  hos_duty_status text not null default 'Off Duty',
  hos_violations integer not null default 0,
  driver_type text,
  address text,
  medical_card_expiry date,
  cdl_expiry date,
  drug_test_date date,
  emergency_name text,
  emergency_phone text,
  compliance_docs jsonb not null default '[]'::jsonb,
  change_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tms_drivers add column if not exists full_name text;
alter table public.tms_drivers add column if not exists phone text;
alter table public.tms_drivers add column if not exists email text;
alter table public.tms_drivers add column if not exists status text default 'Available';
alter table public.tms_drivers add column if not exists license_number text;
alter table public.tms_drivers add column if not exists cdl_state text;
alter table public.tms_drivers add column if not exists hos_available text;
alter table public.tms_drivers add column if not exists current_location text;
alter table public.tms_drivers add column if not exists cdl_class text;
alter table public.tms_drivers add column if not exists endorsements jsonb default '[]'::jsonb;
alter table public.tms_drivers add column if not exists score integer default 0;
alter table public.tms_drivers add column if not exists truck_id text;
alter table public.tms_drivers add column if not exists hos_duty_status text default 'Off Duty';
alter table public.tms_drivers add column if not exists hos_violations integer default 0;
alter table public.tms_drivers add column if not exists driver_type text;
alter table public.tms_drivers add column if not exists address text;
alter table public.tms_drivers add column if not exists medical_card_expiry date;
alter table public.tms_drivers add column if not exists cdl_expiry date;
alter table public.tms_drivers add column if not exists drug_test_date date;
alter table public.tms_drivers add column if not exists emergency_name text;
alter table public.tms_drivers add column if not exists emergency_phone text;
alter table public.tms_drivers add column if not exists compliance_docs jsonb default '[]'::jsonb;
alter table public.tms_drivers add column if not exists change_log jsonb default '[]'::jsonb;
alter table public.tms_drivers add column if not exists created_at timestamptz default now();
alter table public.tms_drivers add column if not exists updated_at timestamptz default now();

create table if not exists public.tms_trucks (
  id text primary key,
  unit_number text not null unique,
  make_model text,
  truck_type text,
  vin text,
  plate_number text,
  plate_state text,
  fuel_type text,
  odometer text,
  eld_provider text,
  eld_serial text,
  pm_interval text,
  capacity text,
  suspension text,
  reefer_hours text,
  status text not null default 'Available',
  current_location text,
  pm_status text not null default 'Current',
  driver_id text,
  registration_expiry date,
  annual_inspection_expiry date,
  compliance_docs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tms_trucks add column if not exists unit_number text;
alter table public.tms_trucks add column if not exists make_model text;
alter table public.tms_trucks add column if not exists truck_type text;
alter table public.tms_trucks add column if not exists vin text;
alter table public.tms_trucks add column if not exists plate_number text;
alter table public.tms_trucks add column if not exists plate_state text;
alter table public.tms_trucks add column if not exists fuel_type text;
alter table public.tms_trucks add column if not exists odometer text;
alter table public.tms_trucks add column if not exists eld_provider text;
alter table public.tms_trucks add column if not exists eld_serial text;
alter table public.tms_trucks add column if not exists pm_interval text;
alter table public.tms_trucks add column if not exists capacity text;
alter table public.tms_trucks add column if not exists suspension text;
alter table public.tms_trucks add column if not exists reefer_hours text;
alter table public.tms_trucks add column if not exists status text default 'Available';
alter table public.tms_trucks add column if not exists current_location text;
alter table public.tms_trucks add column if not exists pm_status text default 'Current';
alter table public.tms_trucks add column if not exists driver_id text;
alter table public.tms_trucks add column if not exists registration_expiry date;
alter table public.tms_trucks add column if not exists annual_inspection_expiry date;
alter table public.tms_trucks add column if not exists compliance_docs jsonb default '[]'::jsonb;
alter table public.tms_trucks add column if not exists created_at timestamptz default now();
alter table public.tms_trucks add column if not exists updated_at timestamptz default now();

-- Uploaded file bodies use the existing `documents` Storage bucket. Their
-- public URL and compliance metadata are stored in the compliance_docs JSONB
-- column on the related driver or unit.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = excluded.public;

-- The current browser uploader uses the public Supabase client. These policies
-- limit anonymous writes to the assets folder while keeping reads public.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'gridtms_asset_uploads') then
    create policy gridtms_asset_uploads on storage.objects
      for insert to anon
      with check (bucket_id = 'documents' and (storage.foldername(name))[1] = 'assets');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'gridtms_asset_reads') then
    create policy gridtms_asset_reads on storage.objects
      for select to anon
      using (bucket_id = 'documents');
  end if;
end $$;

