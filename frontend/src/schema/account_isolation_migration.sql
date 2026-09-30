-- GridTMS per-account data isolation migration
-- Run once in the Supabase SQL Editor BEFORE deploying the matching app build.
-- Safe to re-run. Existing operational records are assigned to the oldest
-- Supabase Auth user; newer users begin with an empty workspace.

do $$
declare
  table_name text;
  first_owner uuid;
  table_names text[] := array[
    'tms_customers',
    'tms_loads',
    'tms_locations',
    'tms_drivers',
    'tms_trucks',
    'tms_invoices',
    'tms_settlements',
    'tms_recurring_rules',
    'tms_compliance_events',
    'tms_company_settings'
  ];
begin
  select id into first_owner
  from auth.users
  order by created_at asc
  limit 1;

  foreach table_name in array table_names loop
    if to_regclass('public.' || table_name) is not null then
      execute format(
        'alter table public.%I add column if not exists owner_id uuid',
        table_name
      );

      if first_owner is not null then
        execute format(
          'update public.%I set owner_id = $1 where owner_id is null',
          table_name
        ) using first_owner;
      end if;

      execute format(
        'create index if not exists %I on public.%I (owner_id)',
        table_name || '_owner_id_idx',
        table_name
      );

      execute format('alter table public.%I enable row level security', table_name);
      execute format('alter table public.%I force row level security', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_full_access', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_owner_access', table_name);
      execute format(
        'create policy %I on public.%I for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',
        table_name || '_owner_access',
        table_name
      );
    end if;
  end loop;
end $$;

-- Keep uploads private. Every object path begins with the authenticated
-- account UUID, so direct Storage access cannot cross account boundaries.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 52428800, null)
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "gridtms_document_uploads" on storage.objects;
drop policy if exists "gridtms_document_reads" on storage.objects;
drop policy if exists "gridtms_document_updates" on storage.objects;
drop policy if exists "gridtms_document_deletes" on storage.objects;
drop policy if exists "gridtms_asset_uploads" on storage.objects;
drop policy if exists "gridtms_asset_reads" on storage.objects;
drop policy if exists "gridtms_location_uploads" on storage.objects;
drop policy if exists "Allow public uploads to documents" on storage.objects;
drop policy if exists "Allow public reads from documents" on storage.objects;

create policy "gridtms_document_uploads" on storage.objects
for insert to authenticated
with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "gridtms_document_reads" on storage.objects
for select to authenticated
using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "gridtms_document_updates" on storage.objects
for update to authenticated
using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid()::text))
with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "gridtms_document_deletes" on storage.objects
for delete to authenticated
using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Values such as unit number and load number only need to be unique inside a
-- company account, not across every GridTMS customer.
do $$
begin
  if to_regclass('public.tms_trucks') is not null then
    alter table public.tms_trucks drop constraint if exists tms_trucks_unit_number_key;
    create unique index if not exists tms_trucks_owner_unit_number_key
      on public.tms_trucks (owner_id, unit_number) where unit_number is not null;
  end if;

  if to_regclass('public.tms_loads') is not null then
    alter table public.tms_loads drop constraint if exists tms_loads_load_number_key;
    create unique index if not exists tms_loads_owner_load_number_key
      on public.tms_loads (owner_id, load_number) where load_number is not null;
  end if;

  if to_regclass('public.tms_invoices') is not null then
    alter table public.tms_invoices drop constraint if exists tms_invoices_invoice_number_key;
    create unique index if not exists tms_invoices_owner_invoice_number_key
      on public.tms_invoices (owner_id, invoice_number) where invoice_number is not null;
  end if;

  if to_regclass('public.tms_settlements') is not null then
    alter table public.tms_settlements drop constraint if exists tms_settlements_settlement_number_key;
    create unique index if not exists tms_settlements_owner_settlement_number_key
      on public.tms_settlements (owner_id, settlement_number) where settlement_number is not null;
  end if;
end $$;
