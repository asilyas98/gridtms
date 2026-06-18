-- GridTMS secure backend schema
-- Run once in Supabase SQL Editor.
-- This matches the gridtms-Anas-V3 table names and adds secure carrier verification tables.

create extension if not exists pgcrypto;

create or replace function trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists locations (
  id varchar(50) primary key,
  name varchar(150) not null,
  type varchar(50) not null,
  street varchar(255) default '',
  city varchar(100) default '',
  state varchar(2) default '',
  zip varchar(10) default '',
  country varchar(100) default 'USA',
  latitude decimal(10,8),
  longitude decimal(11,8),
  operating_hours varchar(100),
  contact_name varchar(100),
  contact_phone varchar(50),
  contact_email varchar(100),
  gate_code varchar(50),
  overnight_parking boolean default false,
  restrooms_available boolean default false,
  scale_on_site boolean default false,
  forklift_on_site boolean default false,
  twic_required boolean default false,
  ppe_required text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_locations on locations;
create trigger set_timestamp_locations before update on locations for each row execute function trigger_set_timestamp();

create table if not exists customers (
  id varchar(50) primary key,
  name varchar(150) not null,
  code varchar(20) unique not null,
  type varchar(50),
  status varchar(50) default 'Prospect',
  credit_limit decimal(12,2) default 5000,
  outstanding_balance decimal(12,2) default 0,
  street varchar(255) default '',
  city varchar(100) default '',
  state varchar(2) default '',
  zip varchar(10) default '',
  country varchar(100) default 'USA',
  phone varchar(50) default '',
  email varchar(100) default '',
  dba varchar(150),
  mc_number varchar(20),
  dot_number varchar(20),
  tax_id varchar(20),
  payment_terms varchar(50) default 'Net 30',
  billing_delivery_method varchar(50) default 'Email',
  require_po boolean default false,
  require_pod boolean default false,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_customers on customers;
create trigger set_timestamp_customers before update on customers for each row execute function trigger_set_timestamp();

create table if not exists trucks (
  id varchar(50) primary key,
  unit_number varchar(50) unique not null,
  make_model varchar(100) default '',
  type varchar(50) default 'Sleeper',
  current_location varchar(255),
  status varchar(50) default 'Available',
  pm_status varchar(50) default 'Current',
  registration_expiry date,
  annual_inspection_expiry date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_trucks on trucks;
create trigger set_timestamp_trucks before update on trucks for each row execute function trigger_set_timestamp();

create table if not exists drivers (
  id varchar(50) primary key,
  name varchar(150) not null,
  current_location varchar(255),
  status varchar(50) default 'Available',
  cdl_class varchar(5) default 'A',
  endorsements text,
  score int default 100,
  truck_id varchar(50) references trucks(id) on delete set null,
  medical_card_expiry date,
  cdl_expiry date,
  drug_test_date date,
  hos_duty_status varchar(50) default 'Off Duty',
  hos_drive_time_hours decimal(4,2) default 11,
  hos_duty_time_hours decimal(4,2) default 14,
  hos_cycle_time_hours decimal(4,2) default 70,
  hos_rest_break_required boolean default false,
  hos_violations int default 0,
  last_status_change timestamp default now(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_drivers on drivers;
create trigger set_timestamp_drivers before update on drivers for each row execute function trigger_set_timestamp();

create table if not exists trailers (
  id varchar(50) primary key,
  unit_number varchar(50) unique not null,
  type varchar(50) default 'Dry Van',
  vin varchar(50),
  serial_number varchar(50),
  make varchar(50),
  model varchar(50),
  year int,
  length varchar(20),
  width varchar(20),
  height varchar(20),
  max_weight decimal(10,2),
  door_type varchar(50),
  plate_number varchar(50),
  plate_state varchar(2),
  registration_expiry date,
  annual_inspection_expiry date,
  ownership varchar(50),
  status varchar(50) default 'Available',
  current_location varchar(255),
  assigned_driver_id varchar(50),
  notes text,
  archived boolean default false,
  archive_note text,
  pm_status varchar(50) default 'Current',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_trailers on trailers;
create trigger set_timestamp_trailers before update on trailers for each row execute function trigger_set_timestamp();

create table if not exists load_board_listings (
  id varchar(50) primary key,
  broker_name varchar(150) not null,
  broker_rating decimal(3,2) default 5,
  origin_city varchar(100) not null,
  origin_state varchar(2) not null,
  destination_city varchar(100) not null,
  destination_state varchar(2) not null,
  pickup_date date not null,
  delivery_date date not null,
  rate decimal(10,2) not null,
  miles decimal(8,2) not null,
  commodity varchar(100) not null,
  weight_lbs int not null,
  equipment_type varchar(50) not null,
  source_platform varchar(50) default 'DAT',
  posted_at timestamp default now(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_load_board_listings on load_board_listings;
create trigger set_timestamp_load_board_listings before update on load_board_listings for each row execute function trigger_set_timestamp();

create table if not exists loads (
  id varchar(50) primary key,
  load_number varchar(50) unique not null,
  status varchar(50) default 'Created',
  priority varchar(20) default 'Medium',
  priority_score decimal(5,2) default 0,
  customer_id varchar(50) references customers(id),
  origin_id varchar(50) references locations(id),
  destination_id varchar(50) references locations(id),
  pickup_date timestamp not null default now(),
  delivery_date timestamp not null default now(),
  driver_id varchar(50) references drivers(id) on delete set null,
  truck_id varchar(50) references trucks(id) on delete set null,
  rate decimal(10,2) default 0,
  miles decimal(8,2) default 0,
  commodity varchar(100) default '',
  weight_lbs int default 0,
  equipment_type varchar(50) default 'Dry Van',
  customer_po varchar(100),
  bol_number varchar(100),
  service_level varchar(50) default 'Standard',
  sent_to_app boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_loads on loads;
create trigger set_timestamp_loads before update on loads for each row execute function trigger_set_timestamp();

create table if not exists load_stops (
  id varchar(50) primary key,
  load_id varchar(50) references loads(id) on delete cascade,
  location_id varchar(50) references locations(id),
  stop_sequence int not null,
  stop_type varchar(20) not null,
  scheduled_arrival timestamp not null,
  scheduled_departure timestamp,
  actual_arrival timestamp,
  actual_departure timestamp,
  status varchar(50) default 'Pending',
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_load_stops on load_stops;
create trigger set_timestamp_load_stops before update on load_stops for each row execute function trigger_set_timestamp();

create table if not exists load_activity_logs (
  id varchar(50) primary key,
  load_id varchar(50) references loads(id) on delete cascade,
  log_user varchar(100) default 'Operations Admin',
  action_text text not null,
  log_type varchar(50) not null,
  logged_at timestamp default now(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_load_activity_logs on load_activity_logs;
create trigger set_timestamp_load_activity_logs before update on load_activity_logs for each row execute function trigger_set_timestamp();

create table if not exists invoices (
  id varchar(50) primary key,
  invoice_number varchar(50) unique not null,
  load_id varchar(50) references loads(id) on delete set null,
  customer_id varchar(50) references customers(id) on delete set null,
  date date default current_date,
  due_date date,
  amount decimal(12,2) default 0,
  status varchar(50) default 'Draft',
  notes text,
  recipient_email varchar(150),
  amount_paid decimal(12,2) default 0,
  aging_bucket varchar(20),
  factoring_status varchar(50),
  terms varchar(50),
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_invoices on invoices;
create trigger set_timestamp_invoices before update on invoices for each row execute function trigger_set_timestamp();

create table if not exists settlements (
  id varchar(50) primary key,
  settlement_number varchar(50) unique,
  driver_id varchar(50) references drivers(id) on delete set null,
  load_id varchar(50) references loads(id) on delete set null,
  period_start date,
  period_end date,
  pay_method varchar(50),
  pay_rate decimal(10,2) default 0,
  base_pay decimal(10,2) default 0,
  gross_earnings decimal(10,2) default 0,
  deductions decimal(10,2) default 0,
  net_pay decimal(10,2) default 0,
  status varchar(50) default 'PENDING',
  notes text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_settlements on settlements;
create trigger set_timestamp_settlements before update on settlements for each row execute function trigger_set_timestamp();

create table if not exists recurring_rules (
  id varchar(50) primary key,
  driver_id varchar(50),
  type varchar(20) not null,
  name varchar(150) not null,
  amount decimal(12,2) default 0,
  frequency varchar(50) default 'WEEKLY',
  active boolean default true,
  start_date date,
  end_date date,
  rate_type varchar(50),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_recurring_rules on recurring_rules;
create trigger set_timestamp_recurring_rules before update on recurring_rules for each row execute function trigger_set_timestamp();

create table if not exists audit_log (
  id varchar(50) primary key default ('audit-' || replace(gen_random_uuid()::text,'-','')),
  user_id text,
  user_name text,
  action text not null,
  entity_type text,
  entity_id text,
  entity_name text,
  description text,
  timestamp timestamptz default now(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);

drop trigger if exists set_timestamp_audit_log on audit_log;
create trigger set_timestamp_audit_log before update on audit_log for each row execute function trigger_set_timestamp();

create table if not exists verified_carriers (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  phone text,
  dot_number text not null,
  mc_number text not null,
  authority_status text not null default 'ACTIVE',
  verification_status text not null default 'verified',
  source text not null default 'manual',
  source_payload jsonb default '{}'::jsonb,
  verified_at timestamptz default now(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz,
  unique(dot_number, mc_number)
);

drop trigger if exists set_timestamp_verified_carriers on verified_carriers;
create trigger set_timestamp_verified_carriers before update on verified_carriers for each row execute function trigger_set_timestamp();

-- Demo verified carrier for local account creation tests.
insert into verified_carriers (legal_name, phone, dot_number, mc_number, authority_status, verification_status, source)
values ('Ahmed Trucking LLC', '248-555-0101', '23412312', 'MC-2341234', 'ACTIVE', 'verified', 'manual_seed')
on conflict (dot_number, mc_number) do update set
  legal_name = excluded.legal_name,
  phone = excluded.phone,
  authority_status = excluded.authority_status,
  verification_status = excluded.verification_status,
  source = excluded.source,
  verified_at = now(),
  updated_at = now();

-- Optional starter data to prove the frontend can load real Supabase values.
insert into locations (id, name, type, street, city, state, zip)
values
  ('loc-chicago-terminal', 'Chicago Terminal', 'Terminal', '100 Terminal Dr', 'Chicago', 'IL', '60601'),
  ('loc-columbus-dc', 'Target Columbus DC', 'Consignee', '200 Distribution Way', 'Columbus', 'OH', '43219')
on conflict (id) do nothing;

insert into customers (id, name, code, status, credit_limit, outstanding_balance, street, city, state, zip, phone, email)
values
  ('cust-target', 'Target Corp', 'TARGET', 'Active', 100000, 87440, '1000 Nicollet Mall', 'Minneapolis', 'MN', '55403', '(612) 304-6073', 'ap@target.com'),
  ('cust-amazon', 'Amazon Logistics', 'AMZN', 'Active', 250000, 124000, '410 Terry Ave N', 'Seattle', 'WA', '98109', '(206) 266-1000', 'billing@amazon.com')
on conflict (id) do nothing;
