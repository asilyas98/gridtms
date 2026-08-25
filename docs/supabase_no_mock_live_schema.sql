-- GridTMS live/no-mock schema
-- This drops and recreates the TMS app tables so the UI starts empty.
-- It keeps only verified_businesses/verified_carriers seeded for login verification.

create extension if not exists "pgcrypto";

drop table if exists
  tms_compliance_events,
  tms_settlements,
  tms_invoices,
  tms_loads,
  tms_locations,
  tms_drivers,
  tms_trucks,
  tms_customers,
  tms_recurring_rules,
  customer_notes,
  shipments,
  customers,
  verified_businesses,
  verified_carriers
cascade;

create table verified_businesses (
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
  source text default 'manual',
  verified_at timestamptz default now(),
  created_at timestamptz default now()
);

create table verified_carriers (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  dba_name text,
  dot_number text not null,
  mc_number text not null,
  authority_status text default 'ACTIVE',
  verification_status text default 'verified',
  source text default 'manual',
  verified_at timestamptz default now(),
  created_at timestamptz default now()
);

create table tms_customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  status text default 'Active',
  credit_limit numeric default 0,
  credit_used numeric default 0,
  payment_terms text default 'Net 30 Days',
  billing_delivery_method text default 'Email PDF',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table tms_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location_type text default 'Shipper',
  address text,
  city text,
  state text,
  zip text,
  country text default 'USA',
  lat numeric,
  lng numeric,
  customer_ids jsonb default '[]'::jsonb,
  connected_account text,
  detention_average text,
  contact_name text,
  contact_phone text,
  contact_email text,
  operating_hours text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table tms_drivers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  status text default 'Available',
  license_number text,
  cdl_class text default 'CDL A',
  endorsements jsonb default '[]'::jsonb,
  hos_available text,
  hos_duty_status text default 'Off Duty',
  current_location text,
  score numeric default 0,
  truck_id uuid,
  driver_type text default 'Company Driver',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table tms_trucks (
  id uuid primary key default gen_random_uuid(),
  unit_number text not null,
  make_model text,
  truck_type text default 'Tractor',
  vin text,
  plate_number text,
  status text default 'Available',
  pm_status text default 'Current',
  current_driver text,
  current_location text,
  driver_id uuid references tms_drivers(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table tms_drivers
  add constraint tms_drivers_truck_id_fkey
  foreign key (truck_id) references tms_trucks(id) on delete set null;

create table tms_loads (
  id uuid primary key default gen_random_uuid(),
  load_number text unique,
  customer_id uuid references tms_customers(id) on delete set null,
  customer_name text,
  origin_id uuid references tms_locations(id) on delete set null,
  destination_id uuid references tms_locations(id) on delete set null,
  origin text,
  destination text,
  status text default 'Created',
  pickup_date date,
  delivery_date date,
  driver_id uuid references tms_drivers(id) on delete set null,
  truck_id uuid references tms_trucks(id) on delete set null,
  driver_name text,
  truck_number text,
  equipment text,
  miles numeric default 0,
  revenue numeric default 0,
  commodity text,
  weight numeric default 0,
  customer_po text,
  bol_number text,
  service_level text,
  notes text,
  line_items jsonb default '[]'::jsonb,
  documents jsonb default '[]'::jsonb,
  activity_log jsonb default '[]'::jsonb,
  sent_to_app boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table tms_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  load_id uuid references tms_loads(id) on delete set null,
  customer_id uuid references tms_customers(id) on delete set null,
  customer_name text,
  amount numeric default 0,
  status text default 'Draft',
  invoice_date date default current_date,
  due_date date,
  paid_at timestamptz,
  notes text,
  method text default 'Email',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table tms_settlements (
  id uuid primary key default gen_random_uuid(),
  settlement_number text,
  statement_code text,
  driver_id uuid references tms_drivers(id) on delete set null,
  driver_name text,
  load_id uuid references tms_loads(id) on delete set null,
  pay_range text,
  period_start date,
  period_end date,
  base_pay numeric default 0,
  gross_pay numeric default 0,
  withholdings numeric default 0,
  net_payout numeric default 0,
  status text default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table tms_compliance_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  title text,
  description text,
  status text default 'created',
  payload jsonb,
  created_at timestamptz default now()
);

create table tms_recurring_rules (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references tms_drivers(id) on delete cascade,
  rule_name text not null,
  rule_type text default 'DEDUCTION',
  amount numeric default 0,
  frequency text default 'WEEKLY',
  rate_type text default 'FLAT',
  start_date date,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Only seed verification records so account creation can pass.
-- No customers, loads, drivers, trucks, invoices, or settlements are seeded.
insert into verified_businesses (
  legal_name, dba_name, registered_address, city, state, zip, phone,
  dot_number, mc_number, authority_status, verification_status, source
) values (
  'Ahmed Trucking LLC', 'Ahmed Trucking', '123 Grid Logistics Way', 'Troy', 'MI', '48083', '248-555-0101',
  '23412312', 'MC-2341234', 'ACTIVE', 'verified', 'manual-demo'
), (
  'SIMPLEAI', 'SIMPLEAI', '730 Dartmouth Dr', 'Rochester', 'MI', '48307', '2488859442',
  '1397601', 'MC-530842', 'ACTIVE', 'verified', 'manual-test'
);

insert into verified_carriers (
  legal_name, dba_name, dot_number, mc_number, authority_status, verification_status, source
) values (
  'Ahmed Trucking LLC', 'Ahmed Trucking', '23412312', 'MC-2341234', 'ACTIVE', 'verified', 'manual-demo'
), (
  'SIMPLEAI', 'SIMPLEAI', '1397601', 'MC-530842', 'ACTIVE', 'verified', 'manual-test'
);
