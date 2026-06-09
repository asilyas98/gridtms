-- Grid TMS backend schema for Supabase
-- Run this once in Supabase SQL Editor before using the connected frontend.

create extension if not exists pgcrypto;

create table if not exists verified_carriers (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  dba_name text,
  dot_number text not null,
  mc_number text not null,
  phone text,
  authority_status text default 'ACTIVE',
  verification_status text default 'verified',
  source text default 'manual',
  source_payload jsonb default '{}'::jsonb,
  verified_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (dot_number, mc_number)
);

insert into verified_carriers (legal_name, dot_number, mc_number, phone, authority_status, verification_status, source)
values ('Ahmed Trucking LLC', '23412312', '2341234', '248-555-0101', 'ACTIVE', 'verified', 'manual_seed')
on conflict (dot_number, mc_number) do nothing;

create table if not exists tms_loads (
  record_id text primary key,
  load_number text,
  customer_id text,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tms_customers (
  record_id text primary key,
  name text,
  email text,
  phone text,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tms_locations (
  record_id text primary key,
  name text,
  type text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tms_drivers (
  record_id text primary key,
  name text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tms_trucks (
  record_id text primary key,
  unit_number text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tms_invoices (
  record_id text primary key,
  invoice_number text,
  load_id text,
  customer_id text,
  status text,
  amount numeric,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tms_settlements (
  record_id text primary key,
  settlement_number text,
  driver_id text,
  status text,
  net_pay numeric,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tms_compliance_events (
  record_id text primary key,
  event_type text,
  title text,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tms_recurring_rules (
  record_id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tms_loads_data on tms_loads using gin (data);
create index if not exists idx_tms_customers_data on tms_customers using gin (data);
create index if not exists idx_tms_locations_data on tms_locations using gin (data);
