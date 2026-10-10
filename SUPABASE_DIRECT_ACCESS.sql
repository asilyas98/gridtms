-- GridTMS Supabase Anonymous & Authenticated Access Setup
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run)
-- to ensure the anon role and authenticated users have permission to read and write TMS data.

do $$
declare
  t text;
  tables text[] := array[
    'tms_customers',
    'tms_locations',
    'tms_drivers',
    'tms_trucks',
    'tms_loads',
    'tms_invoices',
    'tms_settlements',
    'tms_recurring_rules',
    'tms_compliance_events',
    'tms_company_settings'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is not null then
      -- Enable RLS
      execute format('alter table public.%I enable row level security', t);

      -- Grant anon access policy
      execute format('drop policy if exists %I on public.%I', t || '_anon_access', t);
      execute format('create policy %I on public.%I for all to anon using (true) with check (true)', t || '_anon_access', t);

      -- Grant authenticated access policy
      execute format('drop policy if exists %I on public.%I', t || '_authenticated_access', t);
      execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', t || '_authenticated_access', t);

      -- Grant table permissions
      execute format('grant all on public.%I to anon, authenticated', t);
    end if;
  end loop;
end $$;

select 'GridTMS Supabase policies configured successfully' as status;
