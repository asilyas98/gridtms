-- GridTMS complete Supabase backend setup
-- Run this entire file once in Supabase SQL Editor. It is safe to re-run.
-- It creates/aligns every table used by the Netlify API and enables per-account isolation.

create extension if not exists "pgcrypto";

create table if not exists public.tms_customers (id text primary key);
create table if not exists public.tms_locations (id text primary key);
create table if not exists public.tms_drivers (id text primary key);
create table if not exists public.tms_trucks (id text primary key);
create table if not exists public.tms_loads (id text primary key);
create table if not exists public.tms_invoices (id text primary key);
create table if not exists public.tms_settlements (id text primary key);
create table if not exists public.tms_recurring_rules (id text primary key);
create table if not exists public.tms_compliance_events (id text primary key);
create table if not exists public.tms_company_settings (id text primary key);

do $$
declare spec text;
begin
  foreach spec in array array[
    'company_name text', 'email text', 'phone text', 'address text', 'city text', 'state text', 'zip text',
    'status text default ''Active''', 'credit_limit numeric default 0', 'credit_used numeric default 0',
    'payment_terms text default ''Net 30 Days''', 'owner_id uuid',
    'created_at timestamptz default now()', 'updated_at timestamptz default now()'
  ] loop execute 'alter table public.tms_customers add column if not exists ' || spec; end loop;

  foreach spec in array array[
    'name text', 'location_type text default ''Both''', 'address text', 'city text', 'state text', 'zip text',
    'country text default ''USA''', 'lat numeric', 'lng numeric', 'customer_ids jsonb default ''[]''::jsonb',
    'detention_average text', 'contact_name text', 'contact_phone text', 'contact_email text', 'operating_hours text',
    'gate_code text', 'overnight_parking boolean default false', 'restrooms_available boolean default false',
    'scale_on_site boolean default false', 'forklift_on_site boolean default false', 'twic_required boolean default false',
    'ppe_required jsonb default ''[]''::jsonb', 'max_vehicle_height text', 'notes text',
    'compliance_docs jsonb default ''[]''::jsonb', 'owner_id uuid',
    'created_at timestamptz default now()', 'updated_at timestamptz default now()'
  ] loop execute 'alter table public.tms_locations add column if not exists ' || spec; end loop;

  foreach spec in array array[
    'full_name text', 'phone text', 'email text', 'status text default ''Available''', 'license_number text',
    'cdl_state text', 'hos_available text', 'current_location text', 'cdl_class text',
    'endorsements jsonb default ''[]''::jsonb', 'score integer default 0', 'truck_id text',
    'hos_duty_status text default ''Off Duty''', 'hos_violations integer default 0', 'driver_type text',
    'address text', 'medical_card_expiry date', 'cdl_expiry date', 'drug_test_date date',
    'emergency_name text', 'emergency_phone text', 'compliance_docs jsonb default ''[]''::jsonb',
    'change_log jsonb default ''[]''::jsonb', 'owner_id uuid',
    'created_at timestamptz default now()', 'updated_at timestamptz default now()'
  ] loop execute 'alter table public.tms_drivers add column if not exists ' || spec; end loop;

  foreach spec in array array[
    'unit_number text', 'make_model text', 'truck_type text', 'vin text', 'plate_number text', 'plate_state text',
    'fuel_type text', 'odometer text', 'eld_provider text', 'eld_serial text', 'pm_interval text', 'capacity text',
    'suspension text', 'reefer_hours text', 'status text default ''Available''', 'current_location text',
    'pm_status text default ''Current''', 'driver_id text', 'registration_expiry date', 'annual_inspection_expiry date',
    'compliance_docs jsonb default ''[]''::jsonb', 'owner_id uuid',
    'created_at timestamptz default now()', 'updated_at timestamptz default now()'
  ] loop execute 'alter table public.tms_trucks add column if not exists ' || spec; end loop;

  foreach spec in array array[
    'load_number text', 'customer_id text', 'customer_name text', 'origin_id text', 'destination_id text',
    'origin text', 'destination text', 'status text default ''Created''', 'pickup_date timestamptz',
    'delivery_date timestamptz', 'driver_id text', 'truck_id text', 'driver_name text', 'truck_number text',
    'equipment text', 'miles numeric default 0', 'revenue numeric default 0', 'commodity text',
    'weight numeric default 0', 'customer_po text', 'bol_number text', 'service_level text',
    'line_items jsonb default ''[]''::jsonb', 'documents jsonb default ''[]''::jsonb',
    'activity_log jsonb default ''[]''::jsonb', 'sent_to_app boolean default false', 'owner_id uuid',
    'created_at timestamptz default now()', 'updated_at timestamptz default now()'
  ] loop execute 'alter table public.tms_loads add column if not exists ' || spec; end loop;

  foreach spec in array array[
    'invoice_number text', 'load_id text', 'customer_id text', 'customer_name text', 'amount numeric default 0',
    'status text default ''Draft''', 'invoice_date date', 'due_date date', 'notes text', 'method text',
    'documents jsonb default ''[]''::jsonb', 'owner_id uuid',
    'created_at timestamptz default now()', 'updated_at timestamptz default now()'
  ] loop execute 'alter table public.tms_invoices add column if not exists ' || spec; end loop;

  foreach spec in array array[
    'settlement_number text', 'driver_id text', 'load_id text', 'period_start date', 'period_end date',
    'pay_method text', 'pay_rate numeric default 0', 'base_pay numeric default 0', 'fuel_surcharge numeric default 0',
    'detention_pay numeric default 0', 'fuel_advance_deduction numeric default 0', 'insurance_deduction numeric default 0',
    'eld_fee_deduction numeric default 0', 'gross_earnings numeric default 0', 'deductions numeric default 0',
    'net_pay numeric default 0', 'status text default ''PENDING''', 'notes text',
    'custom_revenues jsonb default ''[]''::jsonb', 'custom_deductions jsonb default ''[]''::jsonb',
    'load_itemizations jsonb default ''[]''::jsonb', 'owner_id uuid',
    'created_at timestamptz default now()', 'updated_at timestamptz default now()'
  ] loop execute 'alter table public.tms_settlements add column if not exists ' || spec; end loop;

  foreach spec in array array[
    'driver_id text', 'rule_type text default ''DEDUCTION''', 'rule_name text', 'amount numeric default 0',
    'frequency text default ''WEEKLY''', 'active boolean default true', 'start_date date',
    'rate_type text default ''FLAT''', 'owner_id uuid',
    'created_at timestamptz default now()', 'updated_at timestamptz default now()'
  ] loop execute 'alter table public.tms_recurring_rules add column if not exists ' || spec; end loop;

  foreach spec in array array[
    'event_type text', 'title text', 'status text', 'details jsonb default ''{}''::jsonb', 'event_date timestamptz',
    'owner_id uuid', 'created_at timestamptz default now()', 'updated_at timestamptz default now()'
  ] loop execute 'alter table public.tms_compliance_events add column if not exists ' || spec; end loop;

  foreach spec in array array[
    'carrier_name text', 'dot_number text', 'mc_number text',
    'scac_code text', 'address text', 'currency text default ''USD ($)''',
    'timezone text default ''America/Chicago''', 'primary_color text default ''#E8820C''',
    'auto_invoice boolean default false', 'eld_integration text', 'factoring_partner text',
    'quickbooks_connected boolean default false', 'owner_id uuid',
    'created_at timestamptz default now()', 'updated_at timestamptz default now()'
  ] loop execute 'alter table public.tms_company_settings add column if not exists ' || spec; end loop;
end $$;

-- Assign pre-existing rows to the oldest Auth account. New accounts remain empty.
do $$
declare table_name text; first_owner uuid; constraint_name text;
begin
  select id into first_owner from auth.users order by created_at asc limit 1;
  foreach table_name in array array[
    'tms_customers','tms_locations','tms_drivers','tms_trucks','tms_loads','tms_invoices',
    'tms_settlements','tms_recurring_rules','tms_compliance_events','tms_company_settings'
  ] loop
    -- Ownership is enforced by the API and RLS. Remove older auth.users foreign
    -- keys so the isolated Demo Dispatcher UUID can persist demo records too.
    for constraint_name in
      select c.conname
      from pg_constraint c
      join pg_class r on r.oid = c.conrelid
      join pg_namespace n on n.oid = r.relnamespace
      where n.nspname = 'public'
        and r.relname = table_name
        and c.contype = 'f'
        and pg_get_constraintdef(c.oid) like 'FOREIGN KEY (owner_id)%'
    loop
      execute format('alter table public.%I drop constraint if exists %I', table_name, constraint_name);
    end loop;
    if first_owner is not null then
      execute format('update public.%I set owner_id = $1 where owner_id is null', table_name) using first_owner;
    end if;
    execute format('create index if not exists %I on public.%I (owner_id)', table_name || '_owner_id_idx', table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_owner_access', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_full_access', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',
      table_name || '_owner_access', table_name
    );
  end loop;
end $$;

-- Number fields are unique per account, not globally across all companies.
alter table public.tms_trucks drop constraint if exists tms_trucks_unit_number_key;
alter table public.tms_loads drop constraint if exists tms_loads_load_number_key;
alter table public.tms_invoices drop constraint if exists tms_invoices_invoice_number_key;
alter table public.tms_settlements drop constraint if exists tms_settlements_settlement_number_key;
create unique index if not exists tms_trucks_owner_unit_number_key on public.tms_trucks(owner_id, unit_number) where unit_number is not null;
create unique index if not exists tms_loads_owner_load_number_key on public.tms_loads(owner_id, load_number) where load_number is not null;
create unique index if not exists tms_invoices_owner_invoice_number_key on public.tms_invoices(owner_id, invoice_number) where invoice_number is not null;
create unique index if not exists tms_settlements_owner_settlement_number_key on public.tms_settlements(owner_id, settlement_number) where settlement_number is not null;

-- FMCSA verification cache.
create table if not exists public.verified_businesses (
  id uuid primary key default gen_random_uuid(), legal_name text, dba_name text, registered_address text,
  city text, state text, zip text, phone text, dot_number text, mc_number text,
  authority_status text default 'ACTIVE', verification_status text default 'verified',
  source text default 'FMCSA_QCMobile', verified_at timestamptz default now(),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists verified_businesses_dot_number_idx on public.verified_businesses(dot_number);
alter table public.verified_businesses enable row level security;
alter table public.verified_businesses force row level security;

-- Compliance and logistics document storage configuration
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 52428800, null)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "gridtms_document_uploads" on storage.objects;
drop policy if exists "gridtms_document_reads" on storage.objects;
drop policy if exists "gridtms_document_updates" on storage.objects;
drop policy if exists "gridtms_document_deletes" on storage.objects;
drop policy if exists "gridtms_asset_uploads" on storage.objects;
drop policy if exists "gridtms_asset_reads" on storage.objects;
drop policy if exists "gridtms_location_uploads" on storage.objects;
drop policy if exists "Allow public uploads to documents" on storage.objects;
drop policy if exists "Allow public reads from documents" on storage.objects;

update storage.buckets set public = false where id = 'documents';

create policy "gridtms_document_uploads"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "gridtms_document_reads"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "gridtms_document_updates"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "gridtms_document_deletes"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );


select 'GridTMS backend setup complete' as result;
