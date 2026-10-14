-- Run once in the Supabase SQL Editor. Safe to re-run and does not delete data.

create table if not exists public.tms_company_settings (
  id text primary key,
  carrier_name text not null default '',
  dot_number text not null default '',
  mc_number text not null default '',
  scac_code text not null default '',
  address text not null default '',
  currency text not null default 'USD ($)',
  timezone text not null default 'America/Chicago',
  primary_color text not null default '#E8820C',
  auto_invoice boolean not null default false,
  eld_integration text not null default '',
  factoring_partner text not null default '',
  quickbooks_connected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tms_company_settings add column if not exists carrier_name text not null default '';
alter table public.tms_company_settings add column if not exists dot_number text not null default '';
alter table public.tms_company_settings add column if not exists mc_number text not null default '';
alter table public.tms_company_settings add column if not exists scac_code text not null default '';
alter table public.tms_company_settings add column if not exists address text not null default '';
alter table public.tms_company_settings add column if not exists currency text not null default 'USD ($)';
alter table public.tms_company_settings add column if not exists timezone text not null default 'America/Chicago';
alter table public.tms_company_settings add column if not exists primary_color text not null default '#E8820C';
alter table public.tms_company_settings add column if not exists auto_invoice boolean not null default false;
alter table public.tms_company_settings add column if not exists eld_integration text not null default '';
alter table public.tms_company_settings add column if not exists factoring_partner text not null default '';
alter table public.tms_company_settings add column if not exists quickbooks_connected boolean not null default false;
alter table public.tms_company_settings add column if not exists created_at timestamptz not null default now();
alter table public.tms_company_settings add column if not exists updated_at timestamptz not null default now();

alter table public.tms_company_settings enable row level security;

-- GridTMS reads and writes this table through a Netlify Function using the
-- server-only Supabase service-role key, which bypasses RLS. No public browser
-- policy is intentionally created.
