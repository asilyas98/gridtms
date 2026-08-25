-- GridTMS secure backend schema
-- Run this once in Supabase SQL Editor.
-- Safe to re-run: it uses if-not-exists and upserts the demo verified business.

create extension if not exists "pgcrypto";

create table if not exists verified_businesses (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  dba_name text,
  dot_number text not null,
  mc_number text not null,
  business_verification_number text,
  phone text,
  authority_status text default 'ACTIVE',
  verification_status text default 'verified',
  source text default 'manual',
  source_payload jsonb default '{}'::jsonb,
  verified_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(dot_number, mc_number)
);

-- Extra verification fields used before account creation. Business/state/truck registration fields are kept optional for future use.
alter table verified_businesses add column if not exists registered_address text;
alter table verified_businesses add column if not exists registered_city text;
alter table verified_businesses add column if not exists registered_state text;
alter table verified_businesses add column if not exists registered_zip text;
alter table verified_businesses add column if not exists state_registration_number text;
alter table verified_businesses add column if not exists truck_registration_number text;

create table if not exists business_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null,
  legal_name text not null,
  dba_name text,
  phone text,
  dot_number text not null,
  mc_number text not null,
  business_verification_number text,
  authority_status text,
  verification_status text default 'verified',
  source text default 'manual',
  verified_business_id uuid references verified_businesses(id),
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table business_accounts add column if not exists registered_address text;
alter table business_accounts add column if not exists registered_city text;
alter table business_accounts add column if not exists registered_state text;
alter table business_accounts add column if not exists registered_zip text;
alter table business_accounts add column if not exists state_registration_number text;
alter table business_accounts add column if not exists truck_registration_number text;

create table if not exists auth_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  phone text,
  purpose text not null,
  otp_hash text not null,
  payload jsonb default '{}'::jsonb,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_account_id uuid references business_accounts(id) on delete cascade,
  name text,
  company text,
  email text,
  phone text,
  customer_type text default 'shipper',
  status text default 'active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists loads (
  id uuid primary key default gen_random_uuid(),
  business_account_id uuid references business_accounts(id) on delete cascade,
  load_number text,
  customer text,
  origin text,
  destination text,
  status text default 'Created',
  pickup_date date,
  delivery_date date,
  driver text,
  truck text,
  equipment text,
  miles numeric,
  rate numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  business_account_id uuid references business_accounts(id) on delete cascade,
  name text,
  address text,
  city text,
  state text,
  zip text,
  location_type text,
  contact_name text,
  phone text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  business_account_id uuid references business_accounts(id) on delete cascade,
  name text,
  phone text,
  email text,
  cdl_number text,
  status text default 'active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists trucks (
  id uuid primary key default gen_random_uuid(),
  business_account_id uuid references business_accounts(id) on delete cascade,
  unit_number text,
  truck_type text,
  vin text,
  plate text,
  status text default 'active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  business_account_id uuid references business_accounts(id) on delete cascade,
  invoice_number text,
  load_number text,
  customer text,
  amount numeric,
  status text default 'draft',
  due_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  business_account_id uuid references business_accounts(id) on delete cascade,
  driver text,
  load_number text,
  gross_pay numeric,
  deductions numeric,
  net_pay numeric,
  status text default 'draft',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists compliance_events (
  id uuid primary key default gen_random_uuid(),
  business_account_id uuid references business_accounts(id) on delete cascade,
  event_type text,
  title text,
  description text,
  status text default 'open',
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Demo verified business for local testing.
-- Account creation succeeds when legal name, DOT, MC, phone, and registered address values match.
insert into verified_businesses (
  legal_name,
  dba_name,
  dot_number,
  mc_number,
  phone,
  registered_address,
  registered_city,
  registered_state,
  registered_zip,
  authority_status,
  verification_status,
  source,
  verified_at
)
values (
  'Ahmed Trucking LLC',
  'Ahmed Trucking',
  '23412312',
  'MC-2341234',
  '248-555-0101',
  '123 Grid Logistics Way',
  'Troy',
  'MI',
  '48083',
  'ACTIVE',
  'verified',
  'manual_seed',
  now()
)
on conflict (dot_number, mc_number) do update set
  legal_name = excluded.legal_name,
  dba_name = excluded.dba_name,
  phone = excluded.phone,
  registered_address = excluded.registered_address,
  registered_city = excluded.registered_city,
  registered_state = excluded.registered_state,
  registered_zip = excluded.registered_zip,
  authority_status = excluded.authority_status,
  verification_status = 'verified',
  verified_at = now(),
  updated_at = now();

-- Demo account backing data for username/password demo/demo.
-- The backend demo token uses this business_accounts.id so protected routes can read demo rows.
insert into business_accounts (
  id, auth_user_id, email, legal_name, dba_name, phone,
  registered_address, registered_city, registered_state, registered_zip,
  dot_number, mc_number, authority_status, verification_status, source, verified_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  null,
  'demo@gridtms.local',
  'Demo Trucking LLC',
  'GridTMS Demo Carrier',
  '248-555-0101',
  '123 Demo Logistics Way',
  'Troy',
  'MI',
  '48083',
  '23412312',
  'MC-2341234',
  'ACTIVE',
  'verified',
  'demo_seed',
  now()
)
on conflict (id) do update set
  email = excluded.email,
  legal_name = excluded.legal_name,
  dba_name = excluded.dba_name,
  phone = excluded.phone,
  registered_address = excluded.registered_address,
  registered_city = excluded.registered_city,
  registered_state = excluded.registered_state,
  registered_zip = excluded.registered_zip,
  dot_number = excluded.dot_number,
  mc_number = excluded.mc_number,
  authority_status = excluded.authority_status,
  verification_status = 'verified',
  source = excluded.source,
  verified_at = now(),
  updated_at = now();

insert into customers (business_account_id, name, company, email, phone, customer_type, status, notes)
values
  ('00000000-0000-0000-0000-000000000001', 'Target Corp', 'Target Corp', 'ap@target.demo', '612-304-6073', 'shipper', 'active', 'High-volume demo customer; prefers email PDF invoices.'),
  ('00000000-0000-0000-0000-000000000001', 'Amazon Logistics', 'Amazon Logistics', 'billing@amazon.demo', '206-266-1000', 'shipper', 'active', 'Frequent dry van lanes.'),
  ('00000000-0000-0000-0000-000000000001', 'Midwest Goods Inc', 'Midwest Goods Inc', 'accounting@mwg.demo', '312-555-0199', 'shipper', 'on hold', 'Credit utilization over limit.')
on conflict do nothing;

insert into locations (business_account_id, name, address, city, state, zip, location_type, contact_name, phone, notes)
values
  ('00000000-0000-0000-0000-000000000001', 'Chicago Terminal', '100 Terminal Rd', 'Chicago', 'IL', '60601', 'terminal', 'Ops Desk', '312-555-0100', 'Demo terminal.'),
  ('00000000-0000-0000-0000-000000000001', 'Target Columbus DC', '200 Distribution Way', 'Columbus', 'OH', '43219', 'consignee', 'Receiving', '614-555-0100', 'Demo consignee.')
on conflict do nothing;

insert into loads (business_account_id, load_number, customer, origin, destination, status, pickup_date, delivery_date, driver, truck, equipment, miles, rate, notes)
values
  ('00000000-0000-0000-0000-000000000001', 'LD-004521', 'Target Corp', 'Chicago Terminal', 'Target Columbus DC', 'Invoiced', '2026-05-18', '2026-05-19', 'Marcus Williams', 'TR-1042', 'Dry Van 53''', 368.2, 1039.78, 'Demo load for AI questions.'),
  ('00000000-0000-0000-0000-000000000001', 'LD-004520', 'Amazon Logistics', 'Walmart DC #6029', 'Target Columbus DC', 'Paid', '2026-05-17', '2026-05-18', 'Sarah Peterson', 'TR-2088', 'Dry Van 53''', 512, 1247.50, 'Paid demo load.'),
  ('00000000-0000-0000-0000-000000000001', 'LD-004523', 'Midwest Goods Inc', 'Chicago Terminal', 'Walmart DC #6029', 'Created', '2026-05-20', null, null, null, 'Dry Van 53''', 650, 1450.00, 'Unassigned demo load.')
on conflict do nothing;

insert into invoices (business_account_id, invoice_number, load_number, customer, amount, status, due_date, notes)
values
  ('00000000-0000-0000-0000-000000000001', 'INV-1001', 'LD-004521', 'Target Corp', 1039.78, 'open', '2026-05-30', 'Demo open invoice.'),
  ('00000000-0000-0000-0000-000000000001', 'INV-1002', 'LD-004520', 'Amazon Logistics', 1247.50, 'paid', '2026-05-28', 'Demo paid invoice.')
on conflict do nothing;

insert into settlements (business_account_id, driver, load_number, gross_pay, deductions, net_pay, status, notes)
values
  ('00000000-0000-0000-0000-000000000001', 'Marcus Williams', 'LD-004521', 725, 85, 640, 'draft', 'Demo settlement.')
on conflict do nothing;

insert into compliance_events (business_account_id, event_type, title, description, status, payload)
values
  ('00000000-0000-0000-0000-000000000001', 'audit', 'DOT audit readiness', 'Demo compliance score is 95%.', 'ready', '{"score":95}'::jsonb)
on conflict do nothing;
