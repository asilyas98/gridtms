-- GridTMS billing, driver-app, AI extraction, and duplicate-registration setup.
-- Run after gridtms_backend_setup.sql. Safe to re-run.

create table if not exists public.tms_billing_accounts (
  owner_id uuid primary key,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text default 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tms_driver_accounts (
  auth_user_id uuid primary key,
  owner_id uuid not null,
  driver_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (owner_id, driver_id)
);

create table if not exists public.tms_document_extractions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  file_name text not null,
  category text,
  confidence numeric default 0,
  extracted_data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists tms_document_extractions_owner_idx on public.tms_document_extractions(owner_id);
create index if not exists tms_driver_accounts_owner_idx on public.tms_driver_accounts(owner_id);

-- Carrier identifiers can only belong to one account. Empty identifiers are ignored.
create unique index if not exists tms_company_settings_dot_unique
  on public.tms_company_settings ((regexp_replace(dot_number, '[^0-9]', '', 'g')))
  where coalesce(regexp_replace(dot_number, '[^0-9]', '', 'g'), '') <> '';
create unique index if not exists tms_company_settings_mc_unique
  on public.tms_company_settings ((regexp_replace(mc_number, '[^0-9]', '', 'g')))
  where coalesce(regexp_replace(mc_number, '[^0-9]', '', 'g'), '') <> '';

alter table public.tms_billing_accounts enable row level security;
alter table public.tms_billing_accounts force row level security;
alter table public.tms_driver_accounts enable row level security;
alter table public.tms_driver_accounts force row level security;
alter table public.tms_document_extractions enable row level security;
alter table public.tms_document_extractions force row level security;

drop policy if exists tms_billing_accounts_owner_access on public.tms_billing_accounts;
create policy tms_billing_accounts_owner_access on public.tms_billing_accounts
for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists tms_document_extractions_owner_access on public.tms_document_extractions;
create policy tms_document_extractions_owner_access on public.tms_document_extractions
for select to authenticated using (owner_id = (select auth.uid()));

-- Driver mappings are accessed only through authenticated Netlify functions.
-- No direct client policy is intentionally granted.

select 'GridTMS platform extensions installed' as result;
