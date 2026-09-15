-- GridTMS Location Management persistence migration
-- Run once in Supabase SQL Editor. Safe to re-run and does not delete data.

create extension if not exists "pgcrypto";

create table if not exists public.tms_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location_type text default 'Both',
  address text,
  city text,
  state text,
  zip text,
  country text default 'USA',
  lat numeric,
  lng numeric,
  customer_ids jsonb not null default '[]'::jsonb,
  detention_average text,
  contact_name text,
  contact_phone text,
  contact_email text,
  operating_hours text,
  gate_code text,
  overnight_parking boolean not null default false,
  restrooms_available boolean not null default false,
  scale_on_site boolean not null default false,
  forklift_on_site boolean not null default false,
  twic_required boolean not null default false,
  ppe_required jsonb not null default '[]'::jsonb,
  max_vehicle_height text,
  notes text,
  compliance_docs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tms_locations add column if not exists name text;
alter table public.tms_locations add column if not exists location_type text default 'Both';
alter table public.tms_locations add column if not exists address text;
alter table public.tms_locations add column if not exists city text;
alter table public.tms_locations add column if not exists state text;
alter table public.tms_locations add column if not exists zip text;
alter table public.tms_locations add column if not exists country text default 'USA';
alter table public.tms_locations add column if not exists lat numeric;
alter table public.tms_locations add column if not exists lng numeric;
alter table public.tms_locations add column if not exists customer_ids jsonb default '[]'::jsonb;
alter table public.tms_locations add column if not exists detention_average text;
alter table public.tms_locations add column if not exists contact_name text;
alter table public.tms_locations add column if not exists contact_phone text;
alter table public.tms_locations add column if not exists contact_email text;
alter table public.tms_locations add column if not exists operating_hours text;
alter table public.tms_locations add column if not exists gate_code text;
alter table public.tms_locations add column if not exists overnight_parking boolean default false;
alter table public.tms_locations add column if not exists restrooms_available boolean default false;
alter table public.tms_locations add column if not exists scale_on_site boolean default false;
alter table public.tms_locations add column if not exists forklift_on_site boolean default false;
alter table public.tms_locations add column if not exists twic_required boolean default false;
alter table public.tms_locations add column if not exists ppe_required jsonb default '[]'::jsonb;
alter table public.tms_locations add column if not exists max_vehicle_height text;
alter table public.tms_locations add column if not exists notes text;
alter table public.tms_locations add column if not exists compliance_docs jsonb default '[]'::jsonb;
alter table public.tms_locations add column if not exists created_at timestamptz default now();
alter table public.tms_locations add column if not exists updated_at timestamptz default now();

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'gridtms_location_uploads') then
    create policy gridtms_location_uploads on storage.objects
      for insert to anon
      with check (bucket_id = 'documents' and (storage.foldername(name))[1] = 'locations');
  end if;
end $$;

