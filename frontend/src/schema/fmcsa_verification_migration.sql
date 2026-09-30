-- GridTMS live FMCSA verification cache
-- Run once in Supabase SQL Editor. Safe to re-run and does not delete data.

create extension if not exists "pgcrypto";

create table if not exists public.verified_businesses (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  dba_name text,
  registered_address text,
  city text,
  state text,
  zip text,
  phone text,
  dot_number text not null,
  mc_number text not null,
  authority_status text default 'ACTIVE',
  verification_status text default 'verified',
  source text default 'FMCSA_QCMobile',
  verified_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.verified_businesses add column if not exists legal_name text;
alter table public.verified_businesses add column if not exists dba_name text;
alter table public.verified_businesses add column if not exists registered_address text;
alter table public.verified_businesses add column if not exists city text;
alter table public.verified_businesses add column if not exists state text;
alter table public.verified_businesses add column if not exists zip text;
alter table public.verified_businesses add column if not exists phone text;
alter table public.verified_businesses add column if not exists dot_number text;
alter table public.verified_businesses add column if not exists mc_number text;
alter table public.verified_businesses add column if not exists authority_status text default 'ACTIVE';
alter table public.verified_businesses add column if not exists verification_status text default 'verified';
alter table public.verified_businesses add column if not exists source text default 'FMCSA_QCMobile';
alter table public.verified_businesses add column if not exists verified_at timestamptz default now();
alter table public.verified_businesses add column if not exists created_at timestamptz default now();
alter table public.verified_businesses add column if not exists updated_at timestamptz default now();

create index if not exists verified_businesses_dot_number_idx
  on public.verified_businesses (dot_number);

